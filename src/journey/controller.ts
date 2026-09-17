import * as maplibregl from "maplibre-gl";
import { isPlaybackSpeed } from "./playback-speed";
import type { Map, GeoJSONSource } from "maplibre-gl";
import { km, type Flight, type Airport } from "../../shared/model";
import {
  greatCircle,
  prepareTrail,
  routeFrame,
  splitRoute,
  type Coordinate,
} from "../map-geometry";
import {
  APPROACH,
  approachPose,
  cameraSeparation,
  blendPose,
  followPose,
  moment,
  nearLongitude,
  travelDuration,
  type Pose,
} from "./timeline";
export type TourState = {
  index: number;
  phase: "approach" | "travel" | "arrival";
  progress: number;
  playing: boolean;
  reduced: boolean;
  seconds: number;
};

export function createTour(
  map: Map,
  flights: Flight[],
  airports: Record<string, Airport>,
  publish: (state: TourState) => void,
) {
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const element = document.createElement("div");
  element.className = "tour-plane";
  element.setAttribute("aria-hidden", "true");
  element.innerHTML =
    '<svg viewBox="0 0 32 32" width="40" height="40"><path d="M16 2c-1.2 0-2 1.4-2 3v7L3 19v3l11-3v7l-4 3v2l6-2 6 2v-2l-4-3v-7l11 3v-3l-11-7V5c0-1.6-.8-3-2-3Z" fill="white" stroke="#075bc5" stroke-width="1.4" stroke-linejoin="round"/></svg>';
  const marker = new maplibregl.Marker({
    element,
    anchor: "center",
    rotationAlignment: "map",
    pitchAlignment: "map",
    opacityWhenCovered: 0,
    subpixelPositioning: true,
  });
  let index = 0,
    elapsed = 0,
    speed = 1,
    travel = 26000,
    approach = APPROACH,
    running = !motion.matches,
    frame = 0,
    last = 0,
    lastPublish = -1000,
    lastTrail = -1000,
    lastTrailProgress = Number.NaN,
    disposed = false;
  let points: Coordinate[] = [],
    trails: ReturnType<typeof prepareTrail>[] = [],
    start: Pose;
  let rejoin: { start: Pose; elapsed: number } | null = null;
  const pose = (): Pose => ({
    center: map.getCenter().toArray() as Coordinate,
    zoom: map.getZoom(),
  });
  const snapshot = () => {
    const now = moment(elapsed, travel, approach);
    publish({
      index,
      phase: now.phase,
      progress: now.progress,
      playing: running,
      reduced: motion.matches,
      seconds: Math.ceil((now.total - elapsed) / (1000 * speed)),
    });
  };
  function begin(next: number) {
    index = (next + flights.length) % flights.length;
    const flight = flights[index],
      a = airports[flight.from],
      b = airports[flight.to];
    points = greatCircle(a, b);
    const parts = splitRoute(points);
    trails = parts.map(prepareTrail);
    travel = travelDuration(km(a, b));
    elapsed = 0;
    start = pose();
    approach =
      APPROACH +
      Math.min(
        4000,
        cameraSeparation(
          start,
          followPose(
            points,
            0,
            map.getContainer().clientWidth,
            map.getContainer().clientHeight,
          ),
        ) * 35,
      );
    rejoin = null;
    last = 0;
    lastTrail = -1000;
    lastTrailProgress = Number.NaN;
    (map.getSource("tour-route") as GeoJSONSource).setData({
      type: "FeatureCollection",
      features: parts.map((part, segment) => ({
        type: "Feature",
        properties: { segment },
        geometry: { type: "LineString", coordinates: part.coordinates },
      })),
    });
    (map.getSource("tour-airports") as GeoJSONSource).setData({
      type: "FeatureCollection",
      features: [a, b].map((airport) => ({
        type: "Feature",
        properties: { label: airport.city + "  " + airport.code },
        geometry: { type: "Point", coordinates: [airport.lon, airport.lat] },
      })),
    });
    marker.setLngLat(points[0]).addTo(map);
    if (motion.matches) elapsed = approach + travel;
    else if (!running) elapsed = approach;
    paint(0);
    snapshot();
  }
  function paint(now: number) {
    const { progress } = moment(elapsed, travel, approach),
      point = routeFrame(points, progress);
    const width = map.getContainer().clientWidth,
      height = map.getContainer().clientHeight;
    const target = followPose(points, progress, width, height);
    let camera =
      elapsed < approach
        ? approachPose(start, target, elapsed / approach)
        : target;
    if (rejoin) camera = blendPose(rejoin.start, camera, rejoin.elapsed / 2000);
    camera.center[0] = nearLongitude(camera.center[0], map.getCenter().lng);
    const current = pose();
    if (
      Math.abs(camera.center[0] - current.center[0]) > 1e-8 ||
      Math.abs(camera.center[1] - current.center[1]) > 1e-8 ||
      Math.abs(camera.zoom - current.zoom) > 1e-8
    )
      map.jumpTo({ ...camera, bearing: 0, pitch: 0 });
    marker.setLngLat(point.position).setRotation(point.bearing);
    if (
      (now - lastTrail > 50 || progress === 0 || progress === 1) &&
      progress !== lastTrailProgress
    ) {
      for (let segment = 0; segment < 2; segment++) {
        const p = trails[segment]?.(progress) ?? 0;
        map.setPaintProperty(
          `tour-trail-${segment}`,
          "line-gradient",
          p >= 1
            ? ["literal", "#1687ff"]
            : [
                "step",
                ["line-progress"],
                "#1687ff",
                Math.max(0.000001, p),
                "rgba(22,135,255,0)",
              ],
        );
      }
      lastTrail = now;
      lastTrailProgress = progress;
    }
  }
  function tick(now: number) {
    if (disposed || !running || document.hidden) return;
    const dt = last ? Math.min(now - last, 100) : 0;
    last = now;
    if (rejoin) {
      rejoin.elapsed += dt;
      if (rejoin.elapsed >= 2000) rejoin = null;
    } else elapsed += dt * speed;
    if (elapsed >= moment(elapsed, travel, approach).total) begin(index + 1);
    paint(now);
    if (now - lastPublish > 120) {
      snapshot();
      lastPublish = now;
    }
    frame = requestAnimationFrame(tick);
  }
  function pause() {
    running = false;
    cancelAnimationFrame(frame);
    map.stop();
    last = 0;
    snapshot();
  }
  function resume() {
    if (disposed || motion.matches) return;
    rejoin = { start: pose(), elapsed: 0 };
    running = true;
    last = 0;
    cancelAnimationFrame(frame);
    snapshot();
    frame = requestAnimationFrame(tick);
  }
  function visibility() {
    cancelAnimationFrame(frame);
    last = 0;
    if (!document.hidden && running) frame = requestAnimationFrame(tick);
  }
  function motionChanged() {
    pause();
    if (motion.matches) {
      elapsed = approach + travel;
      paint(0);
    }
    snapshot();
  }
  const canvas = map.getCanvas();
  const interrupt = () => pause();
  canvas.addEventListener("pointerdown", interrupt);
  canvas.addEventListener("wheel", interrupt, { passive: true });
  canvas.addEventListener("keydown", interrupt);
  document.addEventListener("visibilitychange", visibility);
  motion.addEventListener("change", motionChanged);
  begin(0);
  if (running) frame = requestAnimationFrame(tick);
  return {
    pause,
    toggle: () => (running ? pause() : resume()),
    select(next: number) {
      begin(next);
    },
    step(delta: number) {
      begin(index + delta);
    },
    setSpeed(value: number) {
      // Change the clock rate, never the current timeline position.
      if (!isPlaybackSpeed(value)) return;
      speed = value;
      snapshot();
    },
    destroy() {
      disposed = true;
      cancelAnimationFrame(frame);
      marker.remove();
      canvas.removeEventListener("pointerdown", interrupt);
      canvas.removeEventListener("wheel", interrupt);
      canvas.removeEventListener("keydown", interrupt);
      document.removeEventListener("visibilitychange", visibility);
      motion.removeEventListener("change", motionChanged);
    },
  };
}
