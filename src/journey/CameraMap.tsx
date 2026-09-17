import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { Map as LibreMap } from "maplibre-gl";
import type { Airport, Flight } from "../../shared/model";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";
import { createTour, type TourState } from "./controller";
import JourneyControls from "./JourneyControls";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
maplibregl.setWorkerUrl(workerUrl);

const empty = { type: "FeatureCollection" as const, features: [] };
export default function CameraMap({
  flights,
  airports,
}: {
  flights: Flight[];
  airports: Record<string, Airport>;
}) {
  const element = useRef<HTMLDivElement>(null),
    mapRef = useRef<LibreMap | null>(null);
  const controller = useRef<ReturnType<typeof createTour> | null>(null);
  const [tour, setTour] = useState<TourState>({
    index: 0,
    phase: "approach",
    progress: 0,
    playing: false,
    reduced: false,
    seconds: 34,
  });
  const [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0);
  const [earth, setEarth] = useState(true),
    [speed, setSpeed] = useState("1");
  useEffect(() => {
    let disposed = false;
    setReady(false);
    setError("");
    setEarth(true);
    setSpeed("1");
    let map: LibreMap;
    try {
      map = new maplibregl.Map({
        container: element.current!,
        style: "https://tiles.openfreemap.org/styles/bright",
        center: [118, 28],
        zoom: 2.5,
        minZoom: -1,
        maxZoom: 10,
        maxPitch: 0,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        fadeDuration: 0,
        attributionControl: {
          compact: true,
          customAttribution: "航線為機場間示意，非實際飛行軌跡",
        },
      });
    } catch {
      setError("此瀏覽器暫時無法啟動地圖，請重新載入或使用支援 WebGL 的瀏覽器");
      return;
    }
    mapRef.current = map;
    map.touchZoomRotate.disableRotation();
    map
      .getCanvas()
      .setAttribute("aria-label", "旅程鏡頭地圖，拖曳或縮放會暫停自動回放");
    const timer = setTimeout(() => {
      if (!disposed && !map.isStyleLoaded())
        setError("地圖載入較慢，請重試或稍後再看");
    }, 15000);
    map.on("error", () => {
      if (!disposed) setError("部分圖資暫時未能載入，可切換簡潔地圖或重新載入");
    });
    map.on("load", () => {
      if (disposed) return;
      clearTimeout(timer);
      setError("");
      map.setProjection({ type: "globe" });
      map.setSky({
        "sky-color": "#081322",
        "horizon-color": "#95c7f1",
        "fog-color": "#d4e6f2",
        "atmosphere-blend": 0.85,
      });
      for (const layer of map.getStyle().layers)
        if (layer.type === "symbol" && layer.layout?.["text-field"])
          map.setPaintProperty(layer.id, "text-opacity", 0.45);
      map.addSource("tour-earth", {
        type: "raster",
        tileSize: 256,
        maxzoom: 8,
        tiles: [
          "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg",
        ],
        attribution:
          '<a href="https://earthdata.nasa.gov/" target="_blank" rel="noopener">NASA GIBS · Blue Marble</a>',
      });
      map.addLayer({
        id: "tour-earth",
        type: "raster",
        source: "tour-earth",
        paint: {
          "raster-saturation": -0.12,
          "raster-contrast": -0.12,
          "raster-fade-duration": 200,
        },
      });
      map.addSource("tour-route", {
        type: "geojson",
        lineMetrics: true,
        data: empty,
      });
      map.addSource("tour-airports", { type: "geojson", data: empty });
      map.addLayer({
        id: "tour-route-halo",
        type: "line",
        source: "tour-route",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-width": 6,
          "line-color": "#ffffff",
          "line-opacity": 0.12,
        },
      });
      map.addLayer({
        id: "tour-route-line",
        type: "line",
        source: "tour-route",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-width": 2,
          "line-color": "#93c6ff",
          "line-opacity": 0.75,
        },
      });
      for (let segment = 0; segment < 2; segment++)
        map.addLayer({
          id: `tour-trail-${segment}`,
          type: "line",
          source: "tour-route",
          filter: ["==", ["get", "segment"], segment],
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-width": 3, "line-gradient": ["literal", "#1687ff"] },
        });
      map.addLayer({
        id: "tour-airport-dots",
        type: "circle",
        source: "tour-airports",
        paint: {
          "circle-radius": 5,
          "circle-color": "#1687ff",
          "circle-stroke-color": "#fff",
          "circle-stroke-width": 2,
        },
      });
      map.addLayer({
        id: "tour-airport-labels",
        type: "symbol",
        source: "tour-airports",
        layout: {
          "text-field": ["get", "label"],
          "text-font": ["Noto Sans Bold"],
          "text-size": 14,
          "text-variable-anchor": ["left", "right", "top", "bottom"],
          "text-radial-offset": 0.8,
          "text-padding": 12,
        },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": "#18334e",
          "text-halo-width": 1.4,
        },
      });
      map
        .getContainer()
        .querySelector(".maplibregl-ctrl-attrib")
        ?.removeAttribute("open");
      map
        .getContainer()
        .querySelector(".maplibregl-ctrl-attrib-button")
        ?.setAttribute("aria-label", "地圖資料來源");
      controller.current = createTour(map, flights, airports, setTour);
      setReady(true);
    });
    return () => {
      disposed = true;
      clearTimeout(timer);
      controller.current?.destroy();
      controller.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [flights, airports, attempt]);
  function changeMap() {
    const map = mapRef.current;
    if (!map || !ready) return;
    controller.current?.pause();
    const next = !earth;
    map.setProjection({ type: next ? "globe" : "mercator" });
    map.setLayoutProperty(
      "tour-earth",
      "visibility",
      next ? "visible" : "none",
    );
    map.setPaintProperty(
      "tour-airport-labels",
      "text-color",
      next ? "#ffffff" : "#173c63",
    );
    map.setPaintProperty(
      "tour-airport-labels",
      "text-halo-color",
      next ? "#18334e" : "#ffffff",
    );
    map.setPaintProperty(
      "tour-route-line",
      "line-color",
      next ? "#93c6ff" : "#4a8ee6",
    );
    setEarth(next);
    setError("");
  }
  return (
    <main
      className="camera-study flight-ui"
      data-earth={earth}
      data-phase={tour.phase}
    >
      <div className="camera-map" ref={element} />
      <JourneyControls
        flights={flights}
        airports={airports}
        tour={tour}
        ready={ready}
        earth={earth}
        speed={speed}
        onMapChange={changeMap}
        onToggle={() => controller.current?.toggle()}
        onStep={(delta) => controller.current?.step(delta)}
        onSelect={(index) => controller.current?.select(index)}
        onSpeed={(value) => {
          setSpeed(value);
          controller.current?.setSpeed(Number(value));
        }}
      />
      {!ready && !error && (
        <Card material="glass" className="camera-feedback" role="status">
          準備你的飛行回憶…
        </Card>
      )}
      {error && (
        <Card material="glass" className="camera-feedback" role="status">
          <p>{error}</p>
          <Button variant="default" onClick={() => setAttempt((n) => n + 1)}>
            重新載入
          </Button>
        </Card>
      )}
    </main>
  );
}
