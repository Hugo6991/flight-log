import { geoInterpolate } from "d3-geo";
import type { Airport, Flight } from "../shared/model";
export type Coordinate = [number, number];
export const routeKey = (f: Pick<Flight, "from" | "to">) =>
  [f.from, f.to].sort().join("–");

export function greatCircle(a: Airport, b: Airport): Coordinate[] {
  const interpolate = geoInterpolate([a.lon, a.lat], [b.lon, b.lat]);
  const points: Coordinate[] = [];
  for (let i = 0; i <= 96; i++) {
    const [raw, lat] = interpolate(i / 96);
    let lon = raw;
    const previous = points.at(-1)?.[0] ?? raw;
    // Unwrap adjacent points so the Pacific crossing never becomes a long line
    // across Eurasia. MapLibre wraps the resulting geometry with its map world.
    while (lon - previous > 180) lon -= 360;
    while (lon - previous < -180) lon += 360;
    points.push([lon, Math.max(-85, Math.min(85, lat))]);
  }
  return points;
}

export function routeBounds(
  points: Coordinate[],
): [Coordinate, Coordinate] | null {
  if (!points.length) return null;
  const longitudes = points
    .map(([lon]) => ((lon % 360) + 360) % 360)
    .sort((a, b) => a - b);
  let largestGap = -1,
    start = longitudes[0];
  for (let i = 0; i < longitudes.length; i++) {
    const next =
      longitudes[(i + 1) % longitudes.length] +
      (i === longitudes.length - 1 ? 360 : 0);
    if (next - longitudes[i] > largestGap) {
      largestGap = next - longitudes[i];
      start = next % 360;
    }
  }
  let west = start,
    east = start + 360 - largestGap;
  if (west > 180) {
    west -= 360;
    east -= 360;
  }
  return [
    [west, Math.min(...points.map((p) => p[1]))],
    [east, Math.max(...points.map((p) => p[1]))],
  ];
}

export type RoutePart = {
  coordinates: Coordinate[];
  times: number[];
  start: number;
  end: number;
};

/** RFC 7946 coordinates: split a continuous arc at ±180°, not across the map. */
export function splitRoute(points: Coordinate[]): RoutePart[] {
  if (points.length < 2) return [];
  const wrap = (lon: number) => ((((lon + 180) % 360) + 360) % 360) - 180;
  const parts: RoutePart[] = [];
  let current: Coordinate[] = [[wrap(points[0][0]), points[0][1]]];
  let start = 0;
  let times = [0];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i];
    const wa = current.at(-1)![0],
      wb = wrap(b[0]);
    if (Math.abs(wb - wa) > 180) {
      const edge = b[0] > a[0] ? 180 : -180;
      const delta = b[0] - a[0];
      const t = delta === 0 ? 0 : Math.max(0, Math.min(1, (edge - wa) / delta));
      const lat = a[1] + (b[1] - a[1]) * t;
      const progress = (i - 1 + t) / (points.length - 1);
      current.push([edge, lat]);
      times.push(progress);
      parts.push({ coordinates: current, times, start, end: progress });
      current = [[-edge, lat]];
      start = progress;
      times = [progress];
    }
    current.push([wb, b[1]]);
    times.push(i / (points.length - 1));
  }
  parts.push({ coordinates: current, times, start, end: 1 });
  return parts.filter((part) => part.end > part.start);
}

/** A time-based point and local tangent. Refresh rate never changes trip duration. */
export function routeFrame(points: Coordinate[], progress: number) {
  const t = Math.max(0, Math.min(1, progress));
  const offset = t * (points.length - 1);
  const index = Math.min(points.length - 2, Math.floor(offset));
  const a = points[index],
    b = points[index + 1];
  const fraction = offset - index;
  const position: Coordinate = [
    a[0] + (b[0] - a[0]) * fraction,
    a[1] + (b[1] - a[1]) * fraction,
  ];
  const r = Math.PI / 180;
  const d = (b[0] - a[0]) * r;
  const bearing =
    Math.atan2(
      Math.sin(d) * Math.cos(b[1] * r),
      Math.cos(a[1] * r) * Math.sin(b[1] * r) -
        Math.sin(a[1] * r) * Math.cos(b[1] * r) * Math.cos(d),
    ) / r;
  return { position, bearing: (bearing + 360) % 360 };
}

/** MapLibre's line-progress measures Mercator distance, not geographic travel time. */
export function prepareTrail(part: RoutePart) {
  const project = ([lon, lat]: Coordinate): Coordinate => [
    lon / 360,
    -Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) / (2 * Math.PI),
  ];
  const projected = part.coordinates.map(project);
  const lengths = [0];
  for (let i = 1; i < projected.length; i++)
    lengths.push(
      lengths[i - 1] +
        Math.hypot(
          projected[i][0] - projected[i - 1][0],
          projected[i][1] - projected[i - 1][1],
        ),
    );
  const total = lengths.at(-1)!;
  return (progress: number) => {
    if (progress <= part.start || !total) return 0;
    if (progress >= part.end) return 1;
    const next = part.times.findIndex((time) => time > progress);
    const index = next - 1;
    const ratio =
      (progress - part.times[index]) / (part.times[next] - part.times[index]);
    const a = part.coordinates[index],
      b = part.coordinates[next];
    const point = project([
      a[0] + (b[0] - a[0]) * ratio,
      a[1] + (b[1] - a[1]) * ratio,
    ]);
    return Math.min(
      1,
      (lengths[index] +
        Math.hypot(
          point[0] - projected[index][0],
          point[1] - projected[index][1],
        )) /
        total,
    );
  };
}
