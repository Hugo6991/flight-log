import type { Airport, Flight } from "../shared/model";

/** Match the application's Taipei calendar day, recalculated when clicked. */
export function latestReplayFlight(
  flights: Flight[],
  airports: Record<string, Airport>,
  now = new Date(),
): Flight | undefined {
  const today = now.toLocaleDateString("en-CA", { timeZone: "Asia/Taipei" });
  const departure = (flight: Flight) =>
    /^\d{2}:\d{2}$/.test(flight.departure) ? flight.departure : "";
  return flights
    .filter(
      (flight) =>
        flight.status === "flown" &&
        flight.date <= today &&
        airports[flight.from] &&
        airports[flight.to],
    )
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        departure(b).localeCompare(departure(a)) ||
        a.id.localeCompare(b.id),
    )[0];
}
