import { it, expect } from "vitest";
import {
  greatCircle,
  routeBounds,
  routeKey,
  splitRoute,
  routeFrame,
  prepareTrail,
} from "./map-geometry";
import type { Airport } from "../shared/model";
const airport = (lon: number, lat: number): Airport => ({
  code: "ABC",
  city: "",
  name: "",
  country: "",
  lon,
  lat,
});
it("takes the short Pacific route in both directions without dateline jumps", () => {
  for (const [a, b] of [
    [airport(121.23, 25.07), airport(-73.78, 40.64)],
    [airport(-73.78, 40.64), airport(121.23, 25.07)],
  ]) {
    const route = greatCircle(a, b);
    expect(route[0][0]).toBeCloseTo(a.lon);
    expect(Math.abs(route.at(-1)![0] - route[0][0])).toBeLessThan(180);
    expect(
      Math.max(...route.slice(1).map((p, i) => Math.abs(p[0] - route[i][0]))),
    ).toBeLessThan(10);
    const bounds = routeBounds(route)!;
    expect(bounds[1][0] - bounds[0][0]).toBeLessThan(180);
    expect(bounds[1][1]).toBeGreaterThan(50);
  }
});
it("frames airports across the dateline in a two-degree view", () => {
  const bounds = routeBounds([
    [179, 20],
    [-179, 25],
  ])!;
  expect(bounds[1][0] - bounds[0][0]).toBe(2);
  expect(bounds[0][1]).toBe(20);
  expect(bounds[1][1]).toBe(25);
});
it("handles empty and single-airport views and groups return trips", () => {
  expect(routeBounds([])).toBe(null);
  expect(routeBounds([[121, 25]])).toEqual([
    [121, 25],
    [121, 25],
  ]);
  expect(routeKey({ from: "TPE", to: "NRT" })).toBe(
    routeKey({ from: "NRT", to: "TPE" }),
  );
});

it("splits dateline crossings into bounded GeoJSON in either direction", () => {
  for (const route of [
    greatCircle(airport(121, 25), airport(-74, 41)),
    greatCircle(airport(-74, 41), airport(121, 25)),
  ]) {
    const parts = splitRoute(route);
    expect(parts).toHaveLength(2);
    expect(parts[0].end).toBeCloseTo(parts[1].start);
    expect(parts[0].coordinates.at(-1)![0]).toBe(-parts[1].coordinates[0][0]);
    expect(parts[0].coordinates.at(-1)![1]).toBe(parts[1].coordinates[0][1]);
    for (const part of parts) {
      expect(part.times.length).toBe(part.coordinates.length);
      for (let i = 0; i < part.coordinates.length; i++) {
        expect(Math.abs(part.coordinates[i][0])).toBeLessThanOrEqual(180);
        if (i)
          expect(
            Math.abs(part.coordinates[i][0] - part.coordinates[i - 1][0]),
          ).toBeLessThan(15);
      }
    }
  }
});
it("handles exact dateline endpoints without drawing across the world", () => {
  for (const coords of [
    [
      [179, 20],
      [180, 21],
      [181, 22],
    ],
    [
      [181, 22],
      [180, 21],
      [179, 20],
    ],
    [
      [180, 21],
      [179, 20],
    ],
    [
      [179, 20],
      [180, 21],
    ],
  ] as [number, number][][]) {
    const parts = splitRoute(coords);
    expect(parts[0].start).toBe(0);
    expect(parts.at(-1)!.end).toBe(1);
    for (const part of parts)
      for (let i = 1; i < part.coordinates.length; i++)
        expect(
          Math.abs(part.coordinates[i][0] - part.coordinates[i - 1][0]),
        ).toBeLessThanOrEqual(1);
  }
});
it("points east, west and south while retaining exact departure/arrival", () => {
  const east = [
    [179, 0],
    [181, 0],
  ] as [number, number][];
  expect(routeFrame(east, 0).position).toEqual(east[0]);
  expect(routeFrame(east, 1).position).toEqual(east[1]);
  expect(routeFrame(east, 0.5)).toEqual({ position: [180, 0], bearing: 90 });
  expect(routeFrame([...east].reverse(), 0.5).bearing).toBe(270);
  expect(
    routeFrame(
      [
        [121, 31],
        [121, 25],
      ],
      0.5,
    ).bearing,
  ).toBe(180);
});
it("keeps the trail at the plane across unequal Mercator scale and dateline parts", () => {
  const part = splitRoute([
    [0, 0],
    [0, 30],
    [0, 60],
  ])[0];
  const progress = prepareTrail(part);
  // The northern half occupies more projected pixels than the southern half.
  expect(progress(0.5)).toBeCloseTo(
    Math.log(Math.tan(Math.PI / 3)) / Math.log(Math.tan((5 * Math.PI) / 12)),
  );
  expect(progress(0)).toBe(0);
  expect(progress(1)).toBe(1);
  const parts = splitRoute(greatCircle(airport(121, 25), airport(-74, 41)));
  expect(prepareTrail(parts[0])(parts[0].end)).toBe(1);
  expect(prepareTrail(parts[1])(parts[1].start)).toBe(0);
});
