import example from "../data/example/demo.json";
import { stateSchema, type Flight } from "../shared/model";
import { readSaved } from "./storage";

export const isDemoFlight = (flight: Flight) =>
  flight.sources.some((source) => source.type === "demo");

export function demoLabel(flights: Flight[]) {
  const count = flights.filter(isDemoFlight).length;
  return count === 0
    ? ""
    : count === flights.length
      ? "虛構示範資料"
      : "含虛構示範資料";
}

// An intentionally saved empty state takes precedence over both remote and demo data.
// Failed or invalid reads must surface to the caller, never silently become a demo.
export async function loadFlightState(
  fetchState: () => Promise<unknown>,
  storage: Pick<Storage, "getItem" | "setItem"> = localStorage,
) {
  const saved = readSaved(storage);
  if (saved) return { ...saved, source: "browser" as const };
  const remote = stateSchema.parse(await fetchState());
  return {
    state: remote.flights.length ? remote : stateSchema.parse(example),
    revision: 0,
    source: remote.flights.length ? ("remote" as const) : ("demo" as const),
  };
}
