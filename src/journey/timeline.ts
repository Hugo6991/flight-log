import type { Airport, Flight } from "../../shared/model";
import {
  routeBounds,
  routeFrame,
  type Coordinate,
} from "../map-geometry";

export const APPROACH = 4000;
export const ARRIVAL = 4000;
export const clamp = (value: number, low: number, high: number) =>
  Math.min(high, Math.max(low, value));
export const smooth = (value: number) => {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};
export type Pose = { center: Coordinate; zoom: number };
export function playlist(
  flights: Flight[],
  airports: Record<string, Airport>,
  now = new Date(),
) {
  const today = now.toLocaleDateString("en-CA", { timeZone: "Asia/Taipei" });
  return flights
    .filter(
      (f) =>
        f.status === "flown" &&
        f.date <= today &&
        airports[f.from] &&
        airports[f.to],
    )
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        b.departure.localeCompare(a.departure) ||
        a.id.localeCompare(b.id),
    );
}
export function travelDuration(distance: number) {
  return 26000 * clamp(Math.sqrt(distance / 3000), 1, 1.6);
}
export function moment(elapsed: number, travel: number, approach = APPROACH) {
  const total = approach + travel + ARRIVAL;
  if (elapsed < approach)
    return { phase: "approach" as const, progress: 0, total };
  if (elapsed < approach + travel) {
    const t = clamp((elapsed - approach) / travel, 0, 1);
    return {
      phase: "travel" as const,
      progress: 0.8 * t + 0.2 * smooth(t),
      total,
    };
  }
  return { phase: "arrival" as const, progress: 1, total };
}
/** The closest world copy prevents a date-line crossing from spinning the globe. */
export function nearLongitude(lon: number, reference: number) {
  return lon + 360 * Math.round((reference - lon) / 360);
}
export function blendPose(from: Pose, to: Pose, progress: number): Pose {
  const p = smooth(progress);
  return {
    center: [
      from.center[0] +
        (nearLongitude(to.center[0], from.center[0]) - from.center[0]) * p,
      from.center[1] + (to.center[1] - from.center[1]) * p,
    ],
    zoom: from.zoom + (to.zoom - from.zoom) * p,
  };
}
export function followPose(
  points: Coordinate[],
  progress: number,
  width: number,
  height: number,
): Pose {
  const bounds = routeBounds(points)!;
  const span = Math.max(
    bounds[1][0] - bounds[0][0],
    (bounds[1][1] - bounds[0][1]) * 1.6,
    0.5,
  );
  const available = Math.max(200, Math.min(width - 64, height - 260));
  const overview = Math.log2((available * 360) / (512 * span));
  return {
    center: routeFrame(points, Math.min(1, progress + 0.025)).position,
    zoom: clamp(overview + 1.1, 2.4, 5.2) + 0.25 * smooth(progress),
  };
}

/** Distant memories need a wider, longer establishing shot, not a fast pan. */
export function cameraSeparation(from: Pose, to: Pose) {
  return Math.hypot(
    (nearLongitude(to.center[0], from.center[0]) - from.center[0]) *
      Math.cos(((from.center[1] + to.center[1]) * Math.PI) / 360),
    to.center[1] - from.center[1],
  );
}
export function approachPose(from: Pose, to: Pose, progress: number): Pose {
  const camera = blendPose(from, to, progress);
  const distance = cameraSeparation(from, to);
  camera.zoom = Math.max(
    Math.min(from.zoom, to.zoom, 1.25),
    camera.zoom -
      Math.sin(Math.PI * Math.max(0, Math.min(1, progress))) ** 2 *
        Math.min(2.8, Math.max(0, distance - 12) / 30),
  );
  return camera;
}
