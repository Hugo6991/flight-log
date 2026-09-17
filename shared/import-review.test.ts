import { expect, it } from "vitest";
import { prepareImport } from "./import-review";
import type { Airport } from "./model";
const airports = Object.fromEntries(
  ["TPE", "NRT"].map((code) => [code, { code }]),
) as Record<string, Airport>;
const flight = {
  id: "private-booking-id",
  date: "2020-01-01",
  from: "TPE",
  to: "NRT",
  flight: "AB 123",
  departure: "09:00",
  arrival: "13:00",
  status: "unverified",
  note: "private name and booking reference",
  sources: [
    {
      type: "gmail",
      label: "private subject",
      url: "https://mail.google.com/private",
    },
  ],
  price: 100,
};
it("removes private source fields and keeps unverified bookings out of completed mileage", () => {
  const r = prepareImport({ schema_version: 1, flights: [flight] }, airports);
  expect(r.state.flights[0]).toMatchObject({
    status: "unverified",
    note: "",
    flight: "AB123",
    sources: [{ type: "import", label: "匯入的旅行紀錄" }],
  });
  expect(JSON.stringify(r)).not.toContain("private");
  expect(JSON.stringify(r)).not.toContain('"price"');
  expect(r.sql).toContain("json_array_length(payload, '$.flights')=0");
});
it("deduplicates identical segments but stops on conflicting cancellation or time changes", () => {
  expect(
    prepareImport([flight, { ...flight, id: "second" }], airports).report
      .duplicates,
  ).toBe(1);
  expect(() =>
    prepareImport(
      [flight, { ...flight, id: "second", status: "cancelled" }],
      airports,
    ),
  ).toThrow("Conflicting");
  expect(() =>
    prepareImport(
      [flight, { ...flight, id: "second", departure: "10:00" }],
      airports,
    ),
  ).toThrow("Conflicting");
});
it("rejects unknown airports and unstructured time or flight identifiers", () => {
  expect(() => prepareImport([{ ...flight, to: "XYZ" }], airports)).toThrow(
    "Unknown airport",
  );
  expect(() =>
    prepareImport([{ ...flight, flight: "passenger name" }], airports),
  ).toThrow("Review flight number");
  expect(() =>
    prepareImport([{ ...flight, arrival: "tomorrow afternoon" }], airports),
  ).toThrow("Review local flight time");
});
