import { describe, expect, it } from "vitest";
import {
  countryOptions,
  matchesSearch,
  touchesCountry,
} from "./flight-records";
import type { Flight, Airport } from "../shared/model";
const airports = {
  TPE: {
    code: "TPE",
    name: "Taoyuan",
    lat: 25.1,
    lon: 121.2,
    city: "台北",
    country: "TW",
  },
  ICN: {
    code: "ICN",
    name: "Incheon",
    lat: 37.4,
    lon: 126.5,
    city: "首爾",
    country: "KR",
  },
  HKG: {
    code: "HKG",
    name: "Hong Kong",
    lat: 22.3,
    lon: 113.9,
    city: "香港",
    country: "HK",
  },
} as Record<string, Airport>;
const inbound = {
  date: "2020-01-01",
  flight: "AB123",
  from: "TPE",
  to: "ICN",
} as Flight;
const outbound = { ...inbound, flight: "AB124", from: "ICN", to: "TPE" };
describe("country discovery", () => {
  it("finds both arrival and return flights for Korea", () => {
    expect(touchesCountry(inbound, airports, "KR")).toBe(true);
    expect(touchesCountry(outbound, airports, "KR")).toBe(true);
    expect(touchesCountry(inbound, airports, "HK")).toBe(false);
  });
  it("searches country names, airport codes and flight numbers with whitespace", () => {
    for (const q of ["韓國", "首爾", "kr", " icn ", "ab123"])
      expect(matchesSearch(inbound, airports, q)).toBe(true);
    expect(matchesSearch(inbound, airports, "香港")).toBe(false);
  });
  it("includes departure countries and safely ignores airports without metadata", () => {
    expect(
      countryOptions([inbound, outbound], airports)
        .map((c) => c.code)
        .sort(),
    ).toEqual(["KR", "TW"]);
    expect(
      countryOptions([{ ...inbound, from: "XXX" }], airports).map(
        (c) => c.code,
      ),
    ).toEqual(["KR"]);
  });
});
