import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as maplibregl from "maplibre-gl";
import type { Map as LibreMap, GeoJSONSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "./map-experience.css";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
maplibregl.setWorkerUrl(workerUrl);
import {
  Plus,
  Minus,
  LocateFixed,
  SlidersHorizontal,
  AlertCircle,
  RotateCcw,
  LoaderCircle,
  Orbit,
  Play,
  Pause,
  X,
} from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "./components/ui/popover";
import "./components/ui/ui.css";
import type { FeatureCollection, MultiLineString, Point } from "geojson";
import { type Flight, type Airport, km } from "../shared/model";
import {
  greatCircle,
  routeBounds,
  splitRoute,
  routeKey,
  type Coordinate,
} from "./map-geometry";

import { statusLabels } from "./flight-records";
import { startReplay, type ReplayPhase } from "./route-replay";

const EARTH_TILES =
  "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg";
const STYLE = "https://tiles.openfreemap.org/styles/bright";
const reduced = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
function panelVisible(map?: LibreMap) {
  return (
    map?.getContainer().parentElement?.getAttribute("data-panel-visible") ===
    "true"
  );
}
function padding(map?: LibreMap) {
  return window.innerWidth <= 760
    ? {
        top: 164,
        bottom: 102,
        left: 28,
        right: 38,
      }
    : {
        top: 116,
        bottom: 118,
        left: 40,
        right: panelVisible(map) ? 368 : 40,
      };
}
function fit(map: LibreMap, points: Coordinate[], animate = true) {
  const bounds = routeBounds(points);
  if (!bounds) return;
  const duration = animate && !reduced() ? 420 : 0;
  map.stop();
  if (map.getProjection()?.type === "globe") {
    const pad =
      window.innerWidth <= 760
        ? { ...padding(map), left: 0, right: 0 }
        : {
            top: 120,
            bottom: 120,
            left: 24,
            right: panelVisible(map) ? 368 : 24,
          };
    map.setPadding(pad);
    const routeSelected = !!map
      .getContainer()
      .parentElement?.querySelector(".route-replay");
    const span = Math.max(
      bounds[1][0] - bounds[0][0],
      (bounds[1][1] - bounds[0][1]) * 1.5,
      1,
    );
    const availableHeight =
      map.getContainer().clientHeight - pad.top - pad.bottom;
    const availableWidth =
      map.getContainer().clientWidth - pad.left - pad.right;
    const size = Math.max(180, Math.min(availableWidth, availableHeight));
    const zoom = Math.max(
      -1,
      Math.min(
        6.5,
        Math.log2(360 / span) +
          Math.log2(size / 420) +
          (span > 100 ? (routeSelected ? -0.4 : 1.05) : -0.25),
      ),
    );
    map.easeTo({
      center: [
        (bounds[0][0] + bounds[1][0]) / 2,
        (bounds[0][1] + bounds[1][1]) / 2,
      ],
      zoom,
      duration,
    });
  } else {
    map.setPadding({ top: 0, bottom: 0, left: 0, right: 0 });
    map.fitBounds(bounds, { padding: padding(map), maxZoom: 6.5, duration });
  }
}

// Labels are useful only when the whole airport code can be read. Keep the
// dots at the edge, but avoid cropped words while moving around the globe.
function containAirportLabels(map: LibreMap, points: FeatureCollection<Point>) {
  const { clientWidth: width, clientHeight: height } = map.getContainer();
  const codes = points.features
    .filter((feature) => {
      const p = map.project(feature.geometry.coordinates as Coordinate);
      return p.x > 44 && p.x < width - 44 && p.y > 30 && p.y < height - 30;
    })
    .map((feature) => feature.properties?.code as string);
  map.setFilter("airport-labels", [
    "all",
    ["!=", ["get", "active"], true],
    ["in", ["get", "code"], ["literal", codes]],
  ]);
}

export default function FlightMap({
  flights,
  sidebarOpen,
  airports,
  selected,
  selectedFlight,
  onSelectRoute,
  onSelectAirport,
  onClearSelection,
  onShowDetails,
  onReplayLatest,
  detailsButtonRef,
}: {
  flights: Flight[];
  sidebarOpen: boolean;
  airports: Record<string, Airport>;
  selected: string | null;
  selectedFlight?: Flight;
  onSelectRoute: (key: string) => void;
  onSelectAirport: (code: string) => void;
  onClearSelection: () => void;
  onShowDetails: () => void;
  onReplayLatest?: () => void;
  detailsButtonRef: RefObject<HTMLButtonElement | null>;
}) {
  const container = useRef<HTMLDivElement>(null),
    mapRef = useRef<LibreMap | null>(null);
  const [attempt, setAttempt] = useState(0),
    [ready, setReady] = useState(false),
    [error, setError] = useState("");
  const [globe, setGlobe] = useState(true);
  const [optionsOpen, setOptionsOpen] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 760px)");
    const closeDesktopOptions = () => {
      if (!media.matches) setOptionsOpen(false);
    };
    media.addEventListener("change", closeDesktopOptions);
    return () => media.removeEventListener("change", closeDesktopOptions);
  }, []);
  const [earthFailed, setEarthFailed] = useState(false);
  const [phase, setPhase] = useState<ReplayPhase>("finished");
  const [progress, setProgress] = useState(0);
  const replay = useRef<ReturnType<typeof startReplay> | null>(null);
  const hasReplay =
    !!selectedFlight &&
    !["removed", "cancelled"].includes(selectedFlight.status) &&
    !!airports[selectedFlight.from] &&
    !!airports[selectedFlight.to];
  const callbacks = useRef({ onSelectRoute, onSelectAirport });
  callbacks.current = { onSelectRoute, onSelectAirport };
  const activeKey = selectedFlight ? routeKey(selectedFlight) : null;
  const data = useMemo(() => {
    const groups = new Map<string, Flight[]>();
    for (const f of flights) {
      if (!airports[f.from] || !airports[f.to]) continue;
      const key = routeKey(f);
      groups.set(key, [...(groups.get(key) || []), f]);
    }
    const routes: FeatureCollection<MultiLineString> = {
      type: "FeatureCollection",
      features: [],
    };
    const codes = new Set<string>();
    const all: Coordinate[] = [];
    for (const [key, group] of groups) {
      const f = group.find((f) => f.id === selected) || group[0];
      codes.add(f.from);
      codes.add(f.to);
      const status = group.some((f) => f.status === "flown")
        ? "flown"
        : f.status;
      const coordinates = greatCircle(airports[f.from], airports[f.to]);
      all.push(...coordinates);
      routes.features.push({
        type: "Feature",
        properties: {
          key,
          count: group.length,
          status,
          active: key === activeKey,
          color:
            status === "unverified"
              ? "#af741d"
              : status === "upcoming"
                ? "#777f90"
                : "#2879e3",
        },
        geometry: {
          type: "MultiLineString",
          coordinates: splitRoute(coordinates).map((part) => part.coordinates),
        },
      });
    }
    const points: FeatureCollection<Point> = {
      type: "FeatureCollection",
      features: [...codes].map((code) => ({
        type: "Feature",
        properties: {
          code,
          label:
            code +
            (selectedFlight?.from === code
              ? " · 出發"
              : selectedFlight?.to === code
                ? " · 抵達"
                : ""),
          active:
            !!selectedFlight &&
            [selectedFlight.from, selectedFlight.to].includes(code),
        },
        geometry: {
          type: "Point",
          coordinates: [airports[code].lon, airports[code].lat],
        },
      })),
    };
    return {
      routes,
      points,
      all,
    };
  }, [flights, airports, selected, activeKey, selectedFlight]);
  const latest = useRef(data);
  latest.current = data;
  const initialFit = useRef(false);
  const currentSelection = useRef(activeKey);
  currentSelection.current = activeKey;
  useEffect(() => {
    if (!container.current) return;
    let disposed = false,
      map: LibreMap | undefined;
    setReady(false);
    setError("");
    setEarthFailed(false);
    initialFit.current = false;
    const timeout = window.setTimeout(() => {
      if (!disposed && !initialFit.current)
        setError("地圖連線較慢，你仍可以查看與編輯航班。");
    }, 15000);
    try {
      map = new maplibregl.Map({
        container: container.current,
        style: STYLE,
        center: [118, 30],
        zoom: 2.5,
        minZoom: -1,
        maxZoom: 14,
        // The route overview must fit even on a narrow viewport. The default
        // pole constraints otherwise shift northern arcs underneath the stats.
        transformConstrain: (center, zoom) => ({
          center: new maplibregl.LngLat(
            center.lng,
            Math.max(-80, Math.min(80, center.lat)),
          ),
          zoom: Math.max(-1, Math.min(14, zoom)),
        }),
        attributionControl: { compact: true },
        // Native handlers preserve one-finger inertia, pinch zoom and double tap.
        dragPan: true,
        touchZoomRotate: true,
        doubleClickZoom: true,
        cooperativeGestures: false,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        maxPitch: 0,
        fadeDuration: 0,
      });
      map.touchZoomRotate.disableRotation();
      mapRef.current = map;
      map
        .getCanvas()
        .setAttribute(
          "aria-label",
          "旅行航線地圖；單指拖曳、雙指縮放、雙擊放大；方向鍵移動，加減鍵縮放，航班也可由列表選取",
        );
      map.on("error", (event) => {
        if ("sourceId" in event && event.sourceId === "earth-imagery") {
          if (!disposed) {
            setEarthFailed(true);
            if (map?.getLayer("earth-surface"))
              map.setLayoutProperty("earth-surface", "visibility", "none");
          }
          return;
        }
        if (!disposed)
          setError("部分地圖未能載入，請檢查網路或重試。航班紀錄不受影響。");
      });
      map.on("load", () => {
        if (!map || disposed) return;
        clearTimeout(timeout);
        // Keep provider cartography, but give personal airport labels priority.
        for (const layer of map.getStyle().layers) {
          if (layer.type === "symbol" && layer.layout?.["text-field"])
            map.setPaintProperty(layer.id, "text-opacity", [
              "interpolate",
              ["linear"],
              ["zoom"],
              1,
              0.42,
              4,
              0.65,
              7,
              1,
            ]);
        }
        const attribution = map
          .getContainer()
          .querySelector(".maplibregl-ctrl-attrib");
        attribution?.classList.remove("maplibregl-compact-show");
        attribution?.removeAttribute("open");
        map
          .getContainer()
          .querySelector(".maplibregl-ctrl-attrib-button")
          ?.setAttribute("aria-label", "地圖資料來源");
        map.addSource("earth-imagery", {
          type: "raster",
          tiles: [EARTH_TILES],
          tileSize: 256,
          maxzoom: 8,
          attribution:
            '<a href="https://earthdata.nasa.gov/" target="_blank" rel="noopener">NASA GIBS · Blue Marble</a>',
        });
        map.addLayer({
          id: "earth-surface",
          type: "raster",
          source: "earth-imagery",
          layout: { visibility: "none" },
          paint: {
            "raster-saturation": -0.05,
            "raster-brightness-min": 0.08,
            "raster-brightness-max": 1,
            "raster-contrast": -0.12,
            "raster-fade-duration": 200,
          },
        });
        map.addSource("flights", {
          type: "geojson",
          data: latest.current.routes,
        });
        map.addSource("airports", {
          type: "geojson",
          data: latest.current.points,
        });
        map.addSource("replay", {
          type: "geojson",
          lineMetrics: true,
          data: { type: "FeatureCollection", features: [] },
        });
        map.addLayer({
          id: "flight-halo",
          type: "line",
          source: "flights",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": "#ffffff",
            "line-opacity": 0.7,
            "line-width": 4,
          },
        });
        map.addLayer({
          id: "flight-lines",
          type: "line",
          source: "flights",
          filter: ["!=", ["get", "status"], "unverified"],
          paint: {
            "line-color": ["get", "color"],
            "line-width": 1.7,
            "line-opacity": 0.75,
          },
        });
        map.addLayer({
          id: "flight-pending",
          type: "line",
          source: "flights",
          filter: ["==", ["get", "status"], "unverified"],
          paint: {
            "line-color": ["get", "color"],
            "line-width": 1.8,
            "line-dasharray": [2, 2],
            "line-opacity": 0.8,
          },
        });
        map.addLayer({
          id: "flight-active",
          type: "line",
          source: "flights",
          filter: ["==", ["get", "active"], true],
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": "#76aff5", "line-width": 3.5 },
        });
        for (let segment = 0; segment < 2; segment++) {
          map.addLayer({
            id: `replay-trail-${segment}`,
            type: "line",
            source: "replay",
            filter: ["==", ["get", "segment"], segment],
            layout: { "line-cap": "round", "line-join": "round" },
            paint: {
              "line-width": 3.5,
              "line-gradient": ["literal", "#076aeb"],
            },
          });
        }
        map.addLayer({
          id: "flight-hit",
          type: "line",
          source: "flights",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-width": 24, "line-opacity": 0 },
        });
        map.addLayer({
          id: "airport-dots",
          type: "circle",
          source: "airports",
          paint: {
            "circle-radius": ["case", ["get", "active"], 6, 4],
            "circle-color": "#1671e5",
            "circle-stroke-color": "#fff",
            "circle-stroke-width": 2,
          },
        });
        map.addLayer({
          id: "airport-labels",
          filter: ["!=", ["get", "active"], true],
          type: "symbol",
          source: "airports",
          layout: {
            "text-field": ["get", "label"],
            "text-font": ["Noto Sans Bold"],
            "text-size": 12,
            "text-variable-anchor": ["left", "right", "top", "bottom"],
            "text-radial-offset": 0.75,
            "text-padding": 10,
            "symbol-sort-key": ["case", ["get", "active"], 0, 1],
          },
          paint: {
            "text-color": "#133557",
            "text-halo-color": "#fff",
            "text-halo-width": 2,
          },
        });
        map.addLayer({
          id: "airport-active-labels",
          type: "symbol",
          source: "airports",
          filter: ["==", ["get", "active"], true],
          layout: {
            "text-field": ["get", "label"],
            "text-font": ["Noto Sans Bold"],
            "text-size": 13,
            "text-anchor": "bottom",
            "text-offset": [0, -1.15],
            "text-allow-overlap": true,
            "text-ignore-placement": true,
          },
          paint: {
            "text-color": "#064d9e",
            "text-halo-color": "#fff",
            "text-halo-width": 2.5,
          },
        });
        map.on("click", "flight-hit", (e) => {
          if (
            map?.queryRenderedFeatures(e.point, { layers: ["airport-dots"] })
              .length
          )
            return;
          // Shared corridors should replay the highlighted route, rather than
          // unexpectedly switching to a dimmed route underneath it.
          const key =
            e.features?.find(
              (f) => f.properties?.key === currentSelection.current,
            )?.properties?.key ?? e.features?.[0]?.properties?.key;
          if (typeof key === "string") {
            if (key === currentSelection.current) replay.current?.restart();
            callbacks.current.onSelectRoute(key);
          }
        });
        map.on("click", "airport-dots", (e) => {
          const code = e.features?.[0]?.properties?.code;
          if (typeof code === "string") callbacks.current.onSelectAirport(code);
        });
        for (const layer of ["flight-hit", "airport-dots"]) {
          map.on("mouseenter", layer, () => {
            if (map) map.getCanvas().style.cursor = "pointer";
          });
          map.on("mouseleave", layer, () => {
            if (map) map.getCanvas().style.cursor = "";
          });
        }
        map.on("move", () => {
          if (map) containAirportLabels(map, latest.current.points);
        });
        fit(map, latest.current.all, false);
        containAirportLabels(map, latest.current.points);
        initialFit.current = true;
        setReady(true);
        setError("");
      });
    } catch {
      setError("此瀏覽器暫時無法顯示互動地圖。航班列表與編輯仍可使用。");
    }
    let lastWidth = container.current.clientWidth;
    let lastHeight = container.current.clientHeight;
    const observer = new ResizeObserver(() => {
      if (!map || !container.current) return;
      const { clientWidth: width, clientHeight: height } = container.current;
      map.resize();
      if (map.getProjection()?.type === "mercator")
        map.setMinZoom(Math.log2(width / 512));
      if (
        initialFit.current &&
        (width !== lastWidth || height !== lastHeight)
      ) {
        const active = latest.current.routes.features.find(
          (f) => f.properties?.key === currentSelection.current,
        );
        fit(
          map,
          active
            ? (active.geometry.coordinates.flat() as Coordinate[])
            : latest.current.all,
          false,
        );
      }
      lastWidth = width;
      lastHeight = height;
    });
    observer.observe(container.current);
    return () => {
      disposed = true;
      clearTimeout(timeout);
      observer.disconnect();
      replay.current?.destroy();
      replay.current = null;
      map?.remove();
      mapRef.current = null;
    };
  }, [attempt]);
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    map.setMinZoom(
      globe ? -1 : Math.log2(map.getContainer().clientWidth / 512),
    );
    map.setMaxZoom(globe ? 8 : 14);
    map.setProjection({ type: globe ? "globe" : "mercator" });
    map.setLayoutProperty(
      "earth-surface",
      "visibility",
      globe && !earthFailed ? "visible" : "none",
    );
    map.setPaintProperty(
      "flight-lines",
      "line-color",
      globe && !earthFailed ? "#87bbff" : ["get", "color"],
    );
    map.setPaintProperty(
      "flight-halo",
      "line-color",
      globe && !earthFailed ? "#07356e" : "#ffffff",
    );
    for (const id of ["airport-labels", "airport-active-labels"]) {
      map.setPaintProperty(
        id,
        "text-color",
        globe && !earthFailed ? "#ffffff" : "#133557",
      );
      map.setPaintProperty(
        id,
        "text-halo-color",
        globe && !earthFailed ? "#102434" : "#ffffff",
      );
      map.setPaintProperty(
        id,
        "text-halo-width",
        globe && !earthFailed ? 1.3 : 2,
      );
    }
    map.setSky({
      "atmosphere-blend": globe ? 0.85 : 0,
      "sky-color": "#071126",
      "horizon-color": "#93c5f3",
      "fog-color": "#c9e0ed",
      "sky-horizon-blend": 0.5,
    });
    // At zoomed-out globe scales MapLibre constrains the camera to the sphere.
    // Mercator retains its narrow-screen route fitting constraint.
    map.setTransformConstrain(
      globe
        ? null
        : (center, zoom) => ({
            center: new maplibregl.LngLat(
              center.lng,
              Math.max(-80, Math.min(80, center.lat)),
            ),
            zoom: Math.max(-1, Math.min(14, zoom)),
          }),
    );
    for (const layer of map.getStyle().layers) {
      if (
        layer.type === "symbol" &&
        layer.layout?.["text-field"] &&
        !layer.id.startsWith("airport-")
      )
        map.setPaintProperty(
          layer.id,
          "text-opacity",
          globe
            ? ["interpolate", ["linear"], ["zoom"], 4, 0, 6, 1]
            : ["interpolate", ["linear"], ["zoom"], 1, 0.42, 4, 0.65, 7, 1],
        );
      if (layer.type === "background")
        map.setLayoutProperty(layer.id, "visibility", "visible");
    }
    if (hasReplay && selectedFlight)
      fit(
        map,
        greatCircle(airports[selectedFlight.from], airports[selectedFlight.to]),
        false,
      );
    else fit(map, latest.current.all, false);
  }, [globe, ready, earthFailed]);
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    (map.getSource("flights") as GeoJSONSource).setData(data.routes);
    (map.getSource("airports") as GeoJSONSource).setData(data.points);
    containAirportLabels(map, data.points);
    map.setPaintProperty(
      "flight-lines",
      "line-opacity",
      activeKey ? 0.14 : 0.75,
    );
    map.setPaintProperty("flight-halo", "line-opacity", activeKey ? 0 : 0.7);
    map.setPaintProperty("airport-labels", "text-opacity", activeKey ? 0 : 1);
    map.setPaintProperty("airport-dots", "circle-opacity", [
      "case",
      ["get", "active"],
      1,
      activeKey ? 0.3 : 1,
    ]);
    map.setPaintProperty("airport-dots", "circle-radius", [
      "case",
      ["get", "active"],
      6,
      activeKey ? 2 : 4,
    ]);
  }, [data, ready, activeKey]);
  useEffect(() => {
    const map = mapRef.current;
    if (map && ready && !selectedFlight) fit(map, latest.current.all);
  }, [flights, ready, !!selectedFlight, sidebarOpen]);
  useEffect(() => {
    const map = mapRef.current;
    if (
      !map ||
      !ready ||
      !selectedFlight ||
      !airports[selectedFlight.from] ||
      !airports[selectedFlight.to]
    )
      return;
    fit(
      map,
      greatCircle(airports[selectedFlight.from], airports[selectedFlight.to]),
      false,
    );
  }, [
    selected,
    selectedFlight?.from,
    selectedFlight?.to,
    ready,
    airports,
    sidebarOpen,
  ]);
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !hasReplay || !selectedFlight) return;
    const a = airports[selectedFlight.from],
      b = airports[selectedFlight.to];
    const controller = startReplay(
      map,
      greatCircle(a, b),
      km(a, b),
      setPhase,
      setProgress,
    );
    replay.current = controller;
    return () => {
      controller.destroy();
      if (replay.current === controller) replay.current = null;
      if (mapRef.current === map)
        (map.getSource("replay") as GeoJSONSource | undefined)?.setData({
          type: "FeatureCollection",
          features: [],
        });
    };
  }, [
    selected,
    selectedFlight?.from,
    selectedFlight?.to,
    ready,
    hasReplay,
    airports,
  ]);
  return (
    <div
      className={"map-canvas" + (globe ? " space-view" : "")}
      data-panel-visible={sidebarOpen || !!selectedFlight}
    >
      <div className="map-surface" ref={container} data-testid="flight-map" />
      {!ready && !error && (
        <div className="map-loading map-glass" role="status">
          <LoaderCircle size={16} className="spin" /> 正在載入地圖
        </div>
      )}
      {error && (
        <div className="map-error map-glass" role="status">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button
            className="secondary"
            onClick={() => setAttempt((n) => n + 1)}
          >
            <RotateCcw size={15} />
            重試
          </button>
        </div>
      )}
      {ready && !selectedFlight && onReplayLatest && (
        <button className="map-replay-entry map-glass" onClick={onReplayLatest}>
          <Play size={16} /> 回放最近航班
        </button>
      )}
      {selectedFlight && (
        <div
          className={
            "route-replay map-glass" + (!hasReplay ? " mobile-only-replay" : "")
          }
          aria-label="航線回放"
        >
          <button
            className="replay-title replay-mobile-details"
            ref={detailsButtonRef}
            aria-label="查看航班詳情"
            aria-controls="flight-detail"
            onClick={onShowDetails}
          >
            <strong>
              {selectedFlight.from} <span>→</span> {selectedFlight.to}
            </strong>
            <span>{selectedFlight.date} · 詳情</span>
          </button>
          <div className="replay-title replay-desktop-title">
            <strong>
              {selectedFlight.from} <span>→</span> {selectedFlight.to}
            </strong>
            <span>{selectedFlight.date} · 航線回放</span>
          </div>
          {ready && hasReplay && (
            <span className="replay-distance">
              {progress.toLocaleString("zh-TW")} <small>km</small>
            </span>
          )}
          {ready && hasReplay ? (
            phase !== "reduced" ? (
              <button
                className="icon-button"
                aria-label={
                  phase === "playing"
                    ? "暫停航線回放"
                    : phase === "paused"
                      ? "繼續航線回放"
                      : "重播航線"
                }
                onClick={() => replay.current?.toggle()}
              >
                {phase === "playing" ? (
                  <Pause size={17} />
                ) : phase === "paused" ? (
                  <Play size={17} />
                ) : (
                  <RotateCcw size={17} />
                )}
              </button>
            ) : (
              <span className="replay-reduced">減少動態已開啟</span>
            )
          ) : (
            <span className="replay-reduced">
              {!hasReplay ? statusLabels[selectedFlight.status] : "載入中"}
            </span>
          )}
          <button
            className="icon-button replay-close"
            aria-label="關閉航線回放"
            onClick={onClearSelection}
          >
            <X size={18} />
          </button>
        </div>
      )}
      {earthFailed && globe && (
        <div className="earth-notice map-glass" role="status">
          地表影像暫時無法載入，已顯示基本地圖{" "}
          <button onClick={() => setAttempt((n) => n + 1)}>重試</button>
        </div>
      )}
      <div className="map-controls" aria-label="地圖控制">
        <div className="map-projection-controls map-desktop-control map-glass">
          <button
            aria-label="地球視角"
            aria-pressed={globe}
            disabled={!ready}
            onClick={() => setGlobe((value) => !value)}
          >
            <Orbit size={17} />
            <span>地球</span>
          </button>
        </div>
        <div className="map-zoom-controls map-desktop-control map-glass">
          <button
            aria-label="放大地圖"
            disabled={!ready}
            onClick={() =>
              mapRef.current?.zoomIn({ duration: reduced() ? 0 : 200 })
            }
          >
            <Plus size={18} />
          </button>
          <button
            aria-label="縮小地圖"
            disabled={!ready}
            onClick={() =>
              mapRef.current?.zoomOut({ duration: reduced() ? 0 : 200 })
            }
          >
            <Minus size={18} />
          </button>
          <button
            aria-label="回到全部航線"
            disabled={!ready}
            onClick={() =>
              mapRef.current && fit(mapRef.current, latest.current.all)
            }
          >
            <LocateFixed size={18} />
          </button>
        </div>
        <Popover open={optionsOpen} onOpenChange={setOptionsOpen}>
          <PopoverTrigger asChild>
            <button
              className="map-options-trigger map-glass"
              aria-label="地圖選項"
              disabled={!ready}
            >
              <SlidersHorizontal size={18} aria-hidden="true" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="map-options-popover map-glass"
            side="top"
            aria-label="地圖選項"
            onEscapeKeyDown={(event) => event.stopPropagation()}
          >
            <p>單指拖曳 · 雙指縮放 · 雙擊放大</p>
            <div className="map-options-zoom">
              <button
                aria-label="放大地圖"
                onClick={() =>
                  mapRef.current?.zoomIn({ duration: reduced() ? 0 : 200 })
                }
              >
                <Plus size={18} />
                放大
              </button>
              <button
                aria-label="縮小地圖"
                onClick={() =>
                  mapRef.current?.zoomOut({ duration: reduced() ? 0 : 200 })
                }
              >
                <Minus size={18} />
                縮小
              </button>
            </div>
            <button
              aria-pressed={globe}
              onClick={() => {
                setGlobe((value) => !value);
                setOptionsOpen(false);
              }}
            >
              <Orbit size={18} />
              地球視角
            </button>
            <button
              onClick={() => {
                if (mapRef.current) fit(mapRef.current, latest.current.all);
                setOptionsOpen(false);
              }}
            >
              <LocateFixed size={18} />
              回到全部航線
            </button>
          </PopoverContent>
        </Popover>
      </div>
      <p className="map-caption">航線為機場間示意 · 距離採大圓距離估算</p>
    </div>
  );
}
