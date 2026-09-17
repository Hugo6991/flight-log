import { describe, it, expect } from "vitest";
import {
  km,
  stateSchema,
  flightSchema,
  mergeFlights,
  flightKey,
  type Flight,
  type Airport,
} from "./model";
const f: Flight = {
  id: "one",
  date: "2024-02-29",
  flight: "BR 715",
  from: "TPE",
  to: "PVG",
  departure: "10:30",
  arrival: "",
  status: "unverified",
  note: "",
  sources: [],
};
const airport = (lat: number, lon: number): Airport => ({
  code: "ABC",
  name: "",
  city: "",
  country: "",
  lat,
  lon,
});
describe("historical flight integrity", () => {
  it("validates real dates including leap years", () => {
    expect(flightSchema.safeParse(f).success).toBe(true);
    expect(flightSchema.safeParse({ ...f, date: "2025-02-29" }).success).toBe(
      false,
    );
    expect(flightSchema.safeParse({ ...f, date: "2026-13-10" }).success).toBe(
      false,
    );
  });
  it("rejects identical airports and duplicate record IDs", () => {
    expect(flightSchema.safeParse({ ...f, to: "TPE" }).success).toBe(false);
    expect(
      stateSchema.safeParse({ schema_version: 1, flights: [f, f] }).success,
    ).toBe(false);
  });
  it("normalizes flight numbers when avoiding duplicated backup records", () => {
    expect(flightKey(f)).toBe(flightKey({ ...f, flight: "br715" }));
    expect(
      mergeFlights([f], [{ ...f, id: "different", flight: "BR715" }]).added,
    ).toBe(0);
  });
  it("keeps the user’s confirmation and changes when importing an older backup", () => {
    const edited = {
      ...f,
      note: "confirmed by owner",
      status: "flown" as const,
    };
    const result = mergeFlights(
      [edited],
      [f, { ...f, id: "two", date: "2024-03-01" }],
    );
    expect(result.added).toBe(1);
    expect(result.flights[0]).toEqual(edited);
  });
  it("calculates great-circle distance correctly across the international date line", () => {
    expect(km(airport(0, 179), airport(0, -179))).toBeCloseTo(222.39, 1);
    expect(km(airport(0, 0), airport(0, 0))).toBe(0);
    expect(km(airport(0, 0), airport(0, 180))).toBeCloseTo(20015.114, 1);
  });
});
