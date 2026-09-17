import { it, expect } from "vitest";
import { passportArt } from "./passport-art";
import type { Airport, Flight } from "../shared/model";
const airports = {
  TPE: {
    code: "TPE",
    name: "Taoyuan",
    city: "台北",
    country: "TW",
    lon: 121.23,
    lat: 25.07,
  },
  JFK: {
    code: "JFK",
    name: "JFK",
    city: "紐約",
    country: "US",
    lon: -73.78,
    lat: 40.64,
  },
  ICN: {
    code: "ICN",
    name: "Incheon",
    city: "首爾",
    country: "KR",
    lon: 126.45,
    lat: 37.46,
  },
} as Record<string, Airport>;
const flight = (from: string, to: string, status = "flown") =>
  ({ from, to, status }) as Flight;
it("uses only completed, measurable flights and aggregates repeated routes", () => {
  const art = passportArt(
    [
      flight("TPE", "JFK"),
      flight("JFK", "TPE"),
      flight("TPE", "ICN", "cancelled"),
      flight("XXX", "TPE"),
    ],
    airports,
  );
  expect(art.routes).toHaveLength(1);
  expect(art.airports.map((a) => a.code).sort()).toEqual(["JFK", "TPE"]);
  expect(art.routes[0].path).not.toMatch(/NaN|Infinity/);
  expect(art.land.length).toBeGreaterThan(1000);
  expect(art.airports.every((a) => a.point.every(Number.isFinite))).toBe(true);
});
it("produces a real empty map when no journeys are present", () => {
  const art = passportArt([], airports);
  expect(art.routes).toEqual([]);
  expect(art.airports).toEqual([]);
  expect(art.land).toContain("M");
});
