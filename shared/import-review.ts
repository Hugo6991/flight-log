import { createHash } from "node:crypto";
import { stateSchema, flightSchema, flightKey, type Airport } from "./model.ts";

// This runs locally; the website never receives Gmail credentials or message bodies.
export function prepareImport(raw: unknown, airports: Record<string, Airport>) {
  const candidate = Array.isArray(raw)
    ? { schema_version: 1, flights: raw }
    : raw;
  const input = stateSchema.parse(candidate);
  const byKey = new Map<string, ReturnType<typeof flightSchema.parse>>();
  let duplicates = 0;
  for (const f of input.flights) {
    if (!airports[f.from] || !airports[f.to])
      throw new Error(`Unknown airport: ${f.from} / ${f.to}`);
    const flight = f.flight.replace(/\s/g, "").toUpperCase();
    if (flight && !/^[A-Z0-9]{2,3}\d{1,4}[A-Z]?$/.test(flight))
      throw new Error(`Review flight number on ${f.date}: ${flight}`);
    for (const value of [f.departure, f.arrival]) {
      if (
        value &&
        !/^(?:\d{4}-\d{2}-\d{2} )?(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)
      )
        throw new Error(`Review local flight time on ${f.date}`);
    }
    const key = flightKey({ ...f, flight });
    const clean = flightSchema.parse({
      id:
        "flight-" + createHash("sha256").update(key).digest("hex").slice(0, 24),
      date: f.date,
      flight,
      from: f.from,
      to: f.to,
      departure: f.departure,
      arrival: f.arrival,
      status: f.status,
      note: "",
      sources: [{ type: "import", label: "匯入的旅行紀錄" }],
    });
    const existing = byKey.get(key);
    if (existing) {
      if (JSON.stringify(existing) !== JSON.stringify(clean))
        throw new Error(
          `Conflicting booking changes: ${key}. Resolve before importing.`,
        );
      duplicates++;
    } else byKey.set(key, clean);
  }
  const state = stateSchema.parse({
    schema_version: 1,
    flights: [...byKey.values()].sort((a, b) => a.date.localeCompare(b.date)),
  });
  const statuses = Object.fromEntries(
    ["flown", "unverified", "upcoming", "cancelled", "removed"].map((s) => [
      s,
      state.flights.filter((f) => f.status === s).length,
    ]),
  );
  const payload = JSON.stringify(state).replaceAll("'", "''");
  return {
    state,
    sql: `UPDATE flight_state SET payload='${payload}', revision=revision+1, updated_at=CURRENT_TIMESTAMP WHERE id=1 AND json_array_length(payload, '$.flights')=0;\n`,
    report: {
      input: input.flights.length,
      output: state.flights.length,
      duplicates,
      statuses,
      missingFlightNumbers: state.flights.filter((f) => !f.flight).length,
    },
  };
}
