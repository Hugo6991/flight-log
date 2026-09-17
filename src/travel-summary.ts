import { km, type Flight, type Airport } from "../shared/model";

export function passportSummary(
  flights: Flight[],
  airports: Record<string, Airport>,
) {
  const completed = flights
    .filter((f) => f.status === "flown")
    .sort((a, b) => a.date.localeCompare(b.date));
  const measured = completed
    .filter((f) => airports[f.from] && airports[f.to])
    .map((f) => ({
      flight: f,
      distance: km(airports[f.from], airports[f.to]),
    }));
  const countries = new Map<
    string,
    { code: string; first: string; visits: number }
  >();
  for (const f of completed) {
    const code = airports[f.to]?.country;
    if (!code) continue;
    const previous = countries.get(code);
    countries.set(code, {
      code,
      first: previous?.first ?? f.date,
      visits: (previous?.visits ?? 0) + 1,
    });
  }
  return {
    count: completed.length,
    distance: measured.reduce((sum, f) => sum + f.distance, 0),
    first: completed[0],
    last: completed.at(-1),
    longest: measured.sort((a, b) => b.distance - a.distance)[0],
    countries: [...countries.values()],
  };
}
