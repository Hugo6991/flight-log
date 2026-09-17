import { describe, expect, it } from "vitest";
import type { Airport, Flight } from "../shared/model";
import { latestReplayFlight } from "./latest-flight";

const airports: Record<string, Airport> = {
  TPE: {
    code: "TPE",
    name: "Taoyuan",
    city: "Taipei",
    country: "TW",
    lat: 25,
    lon: 121,
  },
  NRT: {
    code: "NRT",
    name: "Narita",
    city: "Tokyo",
    country: "JP",
    lat: 35,
    lon: 140,
  },
};
const flight = (
  id: string,
  date: string,
  changes: Partial<Flight> = {},
): Flight => ({
  id,
  date,
  from: "TPE",
  to: "NRT",
  departure: "",
  arrival: "",
  flight: "",
  status: "flown",
  sources: [],
  note: "",
  ...changes,
});
const now = new Date("2026-09-17T04:00:00Z");

describe("latest flight replay relative to today", () => {
  it("chooses the nearest completed date, not the first record or a future date", () => {
    const records = [
      flight("old", "2024-01-01"),
      flight("future-flown", "2026-09-18"),
      flight("recent", "2026-09-16"),
      flight("future", "2026-09-20", { status: "upcoming" }),
    ];
    expect(latestReplayFlight(records, airports, now)?.id).toBe("recent");
    expect(records.map((f) => f.id)).toEqual([
      "old",
      "future-flown",
      "recent",
      "future",
    ]);
  });
  it("includes today and chooses the later recorded departure on the same date", () => {
    const records = [
      flight("morning", "2026-09-17", { departure: "09:30" }),
      flight("yesterday", "2026-09-16", { departure: "22:00" }),
      flight("unknown-time", "2026-09-17"),
      flight("afternoon", "2026-09-17", { departure: "15:40" }),
    ];
    expect(latestReplayFlight(records, airports, now)?.id).toBe("afternoon");
  });
  it("does not replay unverified, cancelled, removed or unavailable routes", () => {
    const records = [
      flight("valid", "2026-09-01"),
      ...(["unverified", "cancelled", "removed", "upcoming"] as const).map(
        (status) => flight(status, "2026-09-17", { status }),
      ),
      flight("unknown-airport", "2026-09-17", { to: "XXX" }),
    ];
    expect(latestReplayFlight(records, airports, now)?.id).toBe("valid");
    expect(latestReplayFlight(records.slice(1), airports, now)).toBeUndefined();
    expect(latestReplayFlight([], airports, now)).toBeUndefined();
  });
  it("uses the current Taipei date at a midnight boundary", () => {
    const records = [
      flight("previous", "2026-09-16"),
      flight("today", "2026-09-17"),
    ];
    expect(
      latestReplayFlight(records, airports, new Date("2026-09-16T15:59:59Z"))
        ?.id,
    ).toBe("previous");
    expect(
      latestReplayFlight(records, airports, new Date("2026-09-16T16:00:00Z"))
        ?.id,
    ).toBe("today");
  });
});
