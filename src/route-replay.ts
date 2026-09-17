import * as maplibregl from "maplibre-gl";
import type { Map, GeoJSONSource } from "maplibre-gl";
import {
  routeFrame,
  splitRoute,
  prepareTrail,
  type Coordinate,
} from "./map-geometry";
export type ReplayPhase = "playing" | "paused" | "finished" | "reduced";

export function startReplay(
  map: Map,
  points: Coordinate[],
  distance: number,
  onPhase: (phase: ReplayPhase) => void,
  onProgress: (km: number) => void,
) {
  const parts = splitRoute(points);
  const trails = parts.map(prepareTrail);
  const source = map.getSource("replay") as GeoJSONSource;
  source.setData({
    type: "FeatureCollection",
    features: parts.map((part, segment) => ({
      type: "Feature",
      properties: { segment },
      geometry: { type: "LineString", coordinates: part.coordinates },
    })),
  });
  const element = document.createElement("div");
  element.className = "flight-plane";
  element.setAttribute("aria-hidden", "true");
  element.innerHTML =
    '<svg viewBox="0 0 32 32" width="36" height="36" xmlns="http://www.w3.org/2000/svg"><path d="M16 2c-1.2 0-2 1.4-2 3v7L3 19v3l11-3v7l-4 3v2l6-2 6 2v-2l-4-3v-7l11 3v-3l-11-7V5c0-1.6-.8-3-2-3Z" fill="white" stroke="#075bc5" stroke-width="1.4" stroke-linejoin="round"/></svg>';
  const marker = new maplibregl.Marker({
    element,
    anchor: "center",
    rotationAlignment: "map",
    pitchAlignment: "map",
    opacityWhenCovered: 0,
    subpixelPositioning: true,
  })
    .setLngLat(points[0])
    .addTo(map);
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  // Give a touch selection time to settle before the journey finishes.
  const duration = Math.min(10000, 6000 + distance * 0.25);
  let elapsed = 0,
    last = 0,
    frame = 0,
    running = true,
    disposed = false,
    lastPaint = -1000;
  function paint(progress: number) {
    const point = routeFrame(points, progress);
    marker.setLngLat(point.position).setRotation(point.bearing);
    for (let i = 0; i < 2; i++) {
      const p = trails[i]?.(progress) ?? 0;
      map.setPaintProperty(
        `replay-trail-${i}`,
        "line-gradient",
        p >= 1
          ? ["literal", "#076aeb"]
          : [
              "step",
              ["line-progress"],
              "#076aeb",
              Math.max(0.000001, p),
              "rgba(7,106,235,0)",
            ],
      );
    }
  }
  function tick(now: number) {
    if (disposed || !running || document.hidden) return;
    if (last) elapsed += now - last;
    last = now;
    const raw = Math.max(0, Math.min(1, elapsed / duration));
    // Begin immediately; a small eased component keeps arrival gentle without a slow start.
    const progress = 0.8 * raw + 0.2 * (-(Math.cos(Math.PI * raw) - 1) / 2);
    paint(progress);
    if (now - lastPaint > 160 || raw === 1) {
      onProgress(Math.round(distance * progress));
      lastPaint = now;
    }
    if (raw < 1) frame = requestAnimationFrame(tick);
    else {
      running = false;
      onPhase("finished");
    }
  }
  function play() {
    cancelAnimationFrame(frame);
    if (motion.matches) {
      running = false;
      paint(1);
      onProgress(Math.round(distance));
      onPhase("reduced");
      return;
    }
    running = true;
    last = 0;
    onPhase("playing");
    frame = requestAnimationFrame(tick);
  }
  function visibility() {
    cancelAnimationFrame(frame);
    last = 0;
    if (!document.hidden && running) frame = requestAnimationFrame(tick);
  }
  function reducedChange() {
    if (motion.matches) play();
    else {
      // Returning to full motion enables an explicit replay without auto-starting.
      elapsed = duration;
      onPhase("finished");
    }
  }
  document.addEventListener("visibilitychange", visibility);
  motion.addEventListener("change", reducedChange);
  paint(0);
  onProgress(0);
  play();
  return {
    toggle() {
      if (running) {
        running = false;
        cancelAnimationFrame(frame);
        onPhase("paused");
      } else {
        if (elapsed >= duration) elapsed = 0;
        play();
      }
    },
    restart() {
      elapsed = 0;
      paint(0);
      onProgress(0);
      play();
    },
    destroy() {
      disposed = true;
      cancelAnimationFrame(frame);
      marker.remove();
      document.removeEventListener("visibilitychange", visibility);
      motion.removeEventListener("change", reducedChange);
    },
  };
}
