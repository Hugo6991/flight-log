import { describe, expect, it } from "vitest";
import {
  APPROACH,
  ARRIVAL,
  blendPose,
  followPose,
  moment,
  nearLongitude,
  playlist,
  travelDuration,
} from "./timeline";
import { greatCircle } from "../map-geometry";
import type { Airport, Flight } from "../../shared/model";
const a: Airport = {
  code: "TPE",
  name: "Taipei",
  city: "Taipei",
  country: "TW",
  lat: 25,
  lon: 121,
};
const b: Airport = {
  code: "SFO",
  name: "San Francisco",
  city: "SF",
  country: "US",
  lat: 37,
  lon: -122,
};
const airports = { TPE: a, SFO: b };
const base: Flight = {
  id: "a",
  date: "2026-09-09",
  flight: "",
  from: "TPE",
  to: "SFO",
  status: "flown",
  departure: "",
  arrival: "",
  sources: [],
  note: "",
};
describe("journey camera timeline", () => {
  it("begins with the latest eligible flight relative to Taipei today", () => {
    const list = playlist(
      [
        base,
        { ...base, id: "future", date: "2026-09-18" },
        { ...base, id: "cancelled", status: "cancelled" },
        { ...base, id: "pending", status: "unverified" },
        { ...base, id: "unknown", to: "XXX" },
        { ...base, id: "today", date: "2026-09-17" },
      ],
      airports,
      new Date("2026-09-16T18:00:00Z"),
    );
    expect(list.map((f) => f.id)).toEqual(["today", "a"]);
  });
  it("retains repeat trips as separate memories", () =>
    expect(
      playlist([base, { ...base, id: "b", date: "2026-09-08" }], airports),
    ).toHaveLength(2));
  it("has a stationary approach, continuous travel and an arrival hold", () => {
    const travel = travelDuration(1000);
    expect(moment(0, travel).progress).toBe(0);
    expect(moment(APPROACH, travel).progress).toBe(0);
    expect(moment(APPROACH + travel / 2, travel).progress).toBeCloseTo(0.5);
    expect(moment(APPROACH + travel, travel)).toMatchObject({
      phase: "arrival",
      progress: 1,
      total: APPROACH + travel + ARRIVAL,
    });
  });
  it("keeps short flights readable and grants long flights more time", () => {
    expect(travelDuration(100)).toBe(26000);
    expect(travelDuration(12000)).toBe(41600);
  });
  it("crosses the Pacific without a 360-degree camera sweep", () => {
    expect(nearLongitude(-179, 179)).toBe(181);
    expect(
      blendPose(
        { center: [179, 30], zoom: 3 },
        { center: [-179, 32], zoom: 4 },
        0.5,
      ).center[0],
    ).toBe(180);
    const points = greatCircle(a, b);
    let previous = followPose(points, 0, 390, 844);
    for (let i = 1; i <= 100; i++) {
      const next = followPose(points, i / 100, 390, 844);
      expect(Math.abs(next.center[0] - previous.center[0])).toBeLessThan(2);
      expect(next.zoom).toBeGreaterThanOrEqual(2.4);
      expect(next.zoom).toBeLessThanOrEqual(5.45);
      previous = next;
    }
  });
});

it("uses a wider establishing shot between distant memories", async () => {
  const { approachPose } = await import("./timeline");
  const from = { center: [-74, 40] as [number, number], zoom: 5 };
  const to = { center: [121, 25] as [number, number], zoom: 5 };
  expect(approachPose(from, to, 0)).toEqual(from);
  expect(approachPose(from, to, 0.5).zoom).toBeLessThan(3);
  expect(approachPose(from, to, 1).zoom).toBeCloseTo(5);
  const far = { center: [0, 0] as [number, number], zoom: 0 };
  expect(approachPose(far, to, 0)).toEqual(far);
});
