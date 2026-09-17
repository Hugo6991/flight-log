import { it, expect } from "vitest";
import { passportSummary } from "./travel-summary";
import { flightSchema, type Airport } from "../shared/model";
const airports: Record<string, Airport> = {
  TPE: {
    code: "TPE",
    name: "",
    city: "台北",
    country: "TW",
    lon: 121,
    lat: 25,
  },
  JFK: {
    code: "JFK",
    name: "",
    city: "紐約",
    country: "US",
    lon: -74,
    lat: 41,
  },
  PVG: {
    code: "PVG",
    name: "",
    city: "上海",
    country: "CN",
    lon: 121,
    lat: 31,
  },
};
const flight = (
  id: string,
  date: string,
  from: string,
  to: string,
  status = "flown",
) => flightSchema.parse({ id, date, from, to, status });
it("builds keepsakes only from completed records without mutating their order", () => {
  const flights = [
    flight("latest", "2026-01-01", "TPE", "PVG"),
    flight("old", "2019-01-01", "JFK", "TPE"),
    flight("cancel", "2010-01-01", "TPE", "JFK", "cancelled"),
    flight("repeat", "2025-01-01", "TPE", "PVG"),
  ];
  const summary = passportSummary(flights, airports);
  expect(summary.count).toBe(3);
  expect(summary.first?.id).toBe("old");
  expect(summary.last?.id).toBe("latest");
  expect(summary.longest?.flight.id).toBe("old");
  expect(summary.countries).toEqual([
    { code: "TW", first: "2019-01-01", visits: 1 },
    { code: "CN", first: "2025-01-01", visits: 2 },
  ]);
  expect(flights[0].id).toBe("latest");
});
it("handles empty collections and unknown airports without invented distance", () => {
  expect(passportSummary([], airports)).toMatchObject({
    count: 0,
    distance: 0,
    countries: [],
    first: undefined,
    longest: undefined,
  });
  const summary = passportSummary(
    [flight("x", "2024-01-01", "ABC", "XYZ")],
    airports,
  );
  expect(summary.count).toBe(1);
  expect(summary.distance).toBe(0);
  expect(summary.countries).toEqual([]);
});
