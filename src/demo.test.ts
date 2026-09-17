import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import {
  flightKey,
  stateSchema,
  type Flight,
  type FlightState,
} from "../shared/model";
import { loadFlightState, demoLabel, isDemoFlight } from "./demo";
import {
  BEFORE_RESTORE_KEY,
  STORAGE_KEY,
  writeSaved,
  readSaved,
} from "./storage";
import example from "../data/example/demo.json";
import routes from "../data/example/routes.json";
import itinerary from "../data/example/itinerary.json";
import { passportSummary } from "./travel-summary";
import { playlist } from "./journey/timeline";

const airports = JSON.parse(
  readFileSync(new URL("../public/airports.json", import.meta.url), "utf8"),
);
const demo = stateSchema.parse(example);
const empty: FlightState = { schema_version: 1, flights: [] };
const own: Flight = {
  ...demo.flights[0],
  id: "manual-fixture",
  note: "",
  sources: [{ type: "manual", label: "手動補登" }],
};
function store() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}

describe("public fictional history", () => {
  it("covers exactly 120 flights, the requested 20 regions and six continents", () => {
    expect(demo.flights).toHaveLength(120);
    const continents = {
      Asia: ["TW", "CN", "JP", "KR", "SG", "MY", "TH", "VN", "ID", "AE"],
      Europe: ["GB", "FR", "DE", "TR"],
      Oceania: ["AU", "NZ"],
      NorthAmerica: ["US", "CA"],
      SouthAmerica: ["BR"],
      Africa: ["ZA"],
    };
    const countries = passportSummary(demo.flights, airports).countries.map(
      (c) => c.code,
    );
    expect(countries.sort()).toEqual(Object.values(continents).flat().sort());
    expect(
      playlist(demo.flights, airports, new Date("2026-09-17T12:00:00Z")),
    ).toHaveLength(120);
    expect(new Set(demo.flights.map(flightKey)).size).toBe(120);
  });

  it("has six flights per rolling quarter and 24 per rolling year with continuous airports", () => {
    const flights = demo.flights;
    expect(flights[0].date).toBe("2021-09-17");
    expect(flights.at(-1)?.date).toBe("2026-09-16");
    for (let q = 0; q < 20; q++) {
      const start = itinerary[q].quarter_start;
      const end = itinerary[q + 1]?.quarter_start ?? "2026-09-17";
      expect(
        flights.filter((f) => f.date >= start && f.date < end),
      ).toHaveLength(6);
    }
    for (let y = 2021; y < 2026; y++)
      expect(
        flights.filter(
          (f) => f.date >= `${y}-09-17` && f.date < `${y + 1}-09-17`,
        ),
      ).toHaveLength(24);
    for (let i = 1; i < flights.length; i++) {
      expect(flights[i].from).toBe(flights[i - 1].to);
      expect(
        +new Date(flights[i].date) - +new Date(flights[i - 1].date),
      ).toBeGreaterThanOrEqual(2 * 86400000);
    }
    expect(
      flights.filter((f) => ["TPE", "PVG"].includes(f.from)).length,
    ).toBeGreaterThanOrEqual(50);
  });

  it("keeps provenance and a directed airline reference on every fictional flight", () => {
    const hosts = new Set([
      "booking.evaair.com",
      "www.evaair.com",
      "flights.evaair.com",
      "www.airnewzealand.tw",
      "www.singaporeair.com",
      "agent360.singaporeair.com",
      "www.emirates.com",
    ]);
    for (const flight of demo.flights) {
      expect(airports[flight.from]).toBeDefined();
      expect(airports[flight.to]).toBeDefined();
      expect(isDemoFlight(flight)).toBe(true);
      expect(flight.note).toContain("虛構示範資料");
      expect([flight.departure, flight.arrival]).toEqual(["", ""]);
      const matching = routes.filter(
        (r) =>
          r.from_airport === flight.from &&
          r.to_airport === flight.to &&
          r.flight === flight.flight,
      );
      expect(matching).toHaveLength(1);
      expect(matching[0].checked_on).toBe("2026-09-17");
      expect(hosts.has(new URL(matching[0].source_url).hostname)).toBe(true);
      expect(
        flight.sources.find((s) => s.type === "route_reference")?.url,
      ).toBe(matching[0].source_url);
    }
    expect(
      new Set(
        routes.map((r) => `${r.from_airport}-${r.to_airport}-${r.flight}`),
      ).size,
    ).toBe(routes.length);
  });
});

describe("demo loading and personal replacement", () => {
  it("shows a demo only when both browser and a valid remote source are empty", async () => {
    const storage = store();
    expect((await loadFlightState(async () => empty, storage)).state).toEqual(
      demo,
    );
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
    const remote = { ...empty, flights: [own] };
    expect((await loadFlightState(async () => remote, storage)).state).toEqual(
      remote,
    );
  });
  it("prioritizes saved personal data and deliberately empty history, even if the API is unavailable", async () => {
    for (const state of [empty, { ...empty, flights: [own] }]) {
      const storage = store();
      writeSaved(state, 0, storage);
      const fetchState = vi.fn().mockRejectedValue(new Error("offline"));
      expect((await loadFlightState(fetchState, storage)).state).toEqual(state);
      expect(fetchState).not.toHaveBeenCalled();
    }
    const legacy = store();
    legacy.setItem(STORAGE_KEY, JSON.stringify({ ...empty, flights: [own] }));
    const loaded = await loadFlightState(async () => empty, legacy);
    expect(loaded.source).toBe("browser");
    expect(loaded.revision).toBe(0);
  });
  it("surfaces API failures, malformed remote data and corrupt browser data without a demo fallback", async () => {
    await expect(
      loadFlightState(async () => {
        throw new Error("offline");
      }, store()),
    ).rejects.toThrow("offline");
    await expect(loadFlightState(async () => ({}), store())).rejects.toThrow();
    const storage = store();
    storage.setItem(STORAGE_KEY, "broken");
    const fetchState = vi.fn().mockResolvedValue(empty);
    await expect(loadFlightState(fetchState, storage)).rejects.toThrow();
    expect(fetchState).not.toHaveBeenCalled();
  });
  it("labels mixed data and preserves personal flights when clearing only demo rows", async () => {
    const mixed = { ...empty, flights: [...demo.flights, own] };
    expect(demoLabel(demo.flights)).toBe("虛構示範資料");
    expect(demoLabel(mixed.flights)).toBe("含虛構示範資料");
    expect(demoLabel([own])).toBe("");
    expect(demoLabel([])).toBe("");
    const storage = store();
    storage.setItem(BEFORE_RESTORE_KEY, JSON.stringify(mixed));
    let revision = writeSaved(
      { ...empty, flights: mixed.flights.filter((f) => !isDemoFlight(f)) },
      0,
      storage,
    );
    expect(
      (await loadFlightState(async () => empty, storage)).state.flights,
    ).toEqual([own]);
    revision = writeSaved(
      stateSchema.parse(JSON.parse(storage.getItem(BEFORE_RESTORE_KEY)!)),
      revision,
      storage,
    );
    expect(readSaved(storage)?.state).toEqual(mixed);
    expect(revision).toBe(2);
  });
});
