import type { Flight, Airport } from "../shared/model";
const regions = new Intl.DisplayNames(["zh-TW"], { type: "region" });
export const countryName = (code: string) =>
  code === "KR"
    ? "韓國"
    : /^[A-Z]{2}$/.test(code)
      ? (regions.of(code) ?? code)
      : code;
export const statusLabels: Record<Flight["status"], string> = {
  flown: "已搭乘",
  unverified: "待核對",
  upcoming: "未來行程",
  cancelled: "已取消／退票",
  removed: "已移除",
};
export function touchesCountry(
  f: Flight,
  airports: Record<string, Airport>,
  country: string,
) {
  return (
    country === "all" ||
    [airports[f.from]?.country, airports[f.to]?.country].includes(country)
  );
}
export function matchesSearch(
  f: Flight,
  airports: Record<string, Airport>,
  query: string,
) {
  return [
    f.date,
    f.flight,
    f.from,
    f.to,
    ...[f.from, f.to].flatMap((code) => {
      const a = airports[code];
      return a ? [a.city, countryName(a.country), a.country] : [];
    }),
  ]
    .join(" ")
    .toLowerCase()
    .includes(query.trim().toLowerCase());
}
export function countryOptions(
  flights: Flight[],
  airports: Record<string, Airport>,
) {
  return [
    ...new Set(
      flights
        .flatMap((f) => [airports[f.from]?.country, airports[f.to]?.country])
        .filter((c): c is string => !!c),
    ),
  ]
    .map((code) => ({ code, name: countryName(code) }))
    .sort((a, b) => a.name.localeCompare(b.name, "zh-TW"));
}
export const travelGaps: Array<{id:string;country:string;year:string;title:string;period:string;detail:string;source:string;match:string}> = [];
