import { z } from "zod";
export const statusSchema = z.enum([
  "unverified",
  "flown",
  "upcoming",
  "cancelled",
  "removed",
]);
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const d = new Date(v + "T12:00:00Z");
    return !isNaN(+d) && d.toISOString().slice(0, 10) === v;
  }, "日期無效");
export const flightSchema = z
  .object({
    id: z.string().min(1).max(160),
    date: dateSchema,
    flight: z.string().max(20).default(""),
    from: z.string().regex(/^[A-Z]{3}$/),
    to: z.string().regex(/^[A-Z]{3}$/),
    departure: z.string().max(30).default(""),
    arrival: z.string().max(30).default(""),
    status: statusSchema,
    inclusion_basis: z.literal("historical_order").optional(),
    note: z.string().max(4000).default(""),
    sources: z
      .array(
        z.object({
          type: z.string().max(40),
          label: z.string().max(200),
          url: z.string().max(1000).optional(),
        }),
      )
      .max(20)
      .default([]),
  })
  .refine((f) => f.from !== f.to, "出發與抵達機場不能相同");
export const stateSchema = z
  .object({
    schema_version: z.literal(1),
    data_revision: z.number().int().nonnegative().optional(),
    flights: z.array(flightSchema).max(5000),
  })
  .refine(
    (s) => new Set(s.flights.map((f) => f.id)).size === s.flights.length,
    "航班 ID 重複",
  );
export type Flight = z.infer<typeof flightSchema>;
export type FlightState = z.infer<typeof stateSchema>;
export type Airport = {
  code: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
};
export function km(a: Airport, b: Airport) {
  const r = Math.PI / 180;
  const p1 = a.lat * r,
    p2 = b.lat * r;
  const v =
    Math.sin((p2 - p1) / 2) ** 2 +
    Math.cos(p1) * Math.cos(p2) * Math.sin(((b.lon - a.lon) * r) / 2) ** 2;
  return (
    6371.0088 * 2 * Math.atan2(Math.sqrt(v), Math.sqrt(Math.max(0, 1 - v)))
  );
}
export function flightKey(f: Pick<Flight, "date" | "from" | "to" | "flight">) {
  return [f.date, f.from, f.to, f.flight.replace(/\s/g, "").toUpperCase()].join(
    "-",
  );
}
export function mergeFlights(base: Flight[], incoming: Flight[]) {
  const out = [...base];
  let added = 0;
  for (const f of incoming) {
    const exact = out.findIndex(
      (x) => x.id === f.id || flightKey(x) === flightKey(f),
    );
    if (exact < 0) {
      out.push(f);
      added++;
    }
  }
  return { flights: out, added };
}
