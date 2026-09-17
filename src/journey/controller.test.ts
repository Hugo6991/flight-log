import { beforeEach, afterEach, it, expect, vi } from "vitest";
import type { Map as LibreMap } from "maplibre-gl";
import { createTour, type TourState } from "./controller";
import type { Airport, Flight } from "../../shared/model";
const marker = vi.hoisted(() => ({ removed: false }));
vi.mock("maplibre-gl", () => ({
  Marker: class {
    setLngLat() {
      return this;
    }
    setRotation() {
      return this;
    }
    addTo() {
      return this;
    }
    remove() {
      marker.removed = true;
    }
  },
}));
let frames: Map<number, FrameRequestCallback>, id: number, now: number;
let motion: EventTarget & { matches: boolean },
  doc: EventTarget & { hidden: boolean; createElement: () => unknown },
  canvas: EventTarget;
let center: [number, number], zoom: number, state: TourState;
const map = {
  getSource: () => ({ setData: vi.fn() }),
  setPaintProperty: vi.fn(),
  getCenter: () => ({ lng: center[0], toArray: () => [...center] }),
  getZoom: () => zoom,
  getContainer: () => ({ clientWidth: 1440, clientHeight: 900 }),
  getCanvas: () => canvas,
  stop: vi.fn(),
  jumpTo: (pose: { center: [number, number]; zoom: number }) => {
    center = [...pose.center];
    zoom = pose.zoom;
  },
} as unknown as LibreMap;
const airports: Record<string, Airport> = {
  TPE: {
    code: "TPE",
    city: "Taipei",
    name: "Taipei",
    country: "TW",
    lat: 25,
    lon: 121,
  },
  PVG: {
    code: "PVG",
    city: "Shanghai",
    name: "Shanghai",
    country: "CN",
    lat: 31,
    lon: 122,
  },
};
const flight: Flight = {
  id: "a",
  date: "2026-09-09",
  from: "TPE",
  to: "PVG",
  flight: "",
  departure: "",
  arrival: "",
  status: "flown",
  note: "",
  sources: [],
};
function start() {
  return createTour(
    map,
    [flight, { ...flight, id: "b", from: "PVG", to: "TPE" }],
    airports,
    (next) => {
      state = next;
    },
  );
}
function advance(ms: number, hz = 60) {
  const end = now + ms;
  while (now < end) {
    now = Math.min(end, now + 1000 / hz);
    const batch = [...frames.values()];
    frames.clear();
    batch.forEach((fn) => fn(now));
  }
}
beforeEach(() => {
  frames = new Map();
  id = 0;
  now = 100;
  center = [118, 28];
  zoom = 2.5;
  marker.removed = false;
  motion = Object.assign(new EventTarget(), { matches: false });
  canvas = new EventTarget();
  doc = Object.assign(new EventTarget(), {
    hidden: false,
    createElement: () => ({
      setAttribute: vi.fn(),
      className: "",
      innerHTML: "",
    }),
  });
  vi.stubGlobal("document", doc);
  vi.stubGlobal("matchMedia", () => motion);
  vi.stubGlobal("requestAnimationFrame", (fn: FrameRequestCallback) => {
    frames.set(++id, fn);
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (key: number) => frames.delete(key));
});
afterEach(() => vi.unstubAllGlobals());
it("automatically advances and loops at both 30 and 120 Hz", () => {
  for (const hz of [30, 120]) {
    const tour = start();
    advance(36000, hz);
    expect(state.index).toBe(1);
    advance(36000, hz);
    expect(state.index).toBe(0);
    tour.destroy();
    expect(frames.size).toBe(0);
  }
});
it("pauses camera and plane time on a map gesture and resumes smoothly", () => {
  const tour = start();
  advance(12000);
  canvas.dispatchEvent(new Event("pointerdown"));
  const position = [...center],
    progress = state.progress;
  advance(5000);
  expect(center).toEqual(position);
  expect(state.progress).toBe(progress);
  expect(state.playing).toBe(false);
  tour.toggle();
  advance(4000);
  expect(state.playing).toBe(true);
  expect(state.progress).toBeGreaterThan(progress);
  tour.destroy();
});
it("does not skip time in a hidden tab or resume a user pause", () => {
  const tour = start();
  advance(12000);
  doc.hidden = true;
  doc.dispatchEvent(new Event("visibilitychange"));
  const progress = state.progress;
  advance(60000);
  expect(state.progress).toBe(progress);
  doc.hidden = false;
  doc.dispatchEvent(new Event("visibilitychange"));
  advance(50);
  expect(state.progress - progress).toBeLessThan(0.01);
  tour.pause();
  doc.hidden = true;
  doc.dispatchEvent(new Event("visibilitychange"));
  doc.hidden = false;
  doc.dispatchEvent(new Event("visibilitychange"));
  expect(frames.size).toBe(0);
  tour.destroy();
});
it("respects reduced motion at launch and during playback", () => {
  motion.matches = true;
  const tour = start();
  expect(frames.size).toBe(0);
  expect(state.reduced).toBe(true);
  tour.step(1);
  expect(state.index).toBe(1);
  expect(frames.size).toBe(0);
  motion.matches = false;
  motion.dispatchEvent(new Event("change"));
  expect(frames.size).toBe(0);
  tour.toggle();
  advance(6000);
  motion.matches = true;
  motion.dispatchEvent(new Event("change"));
  expect(frames.size).toBe(0);
  expect(state.playing).toBe(false);
  tour.destroy();
  expect(marker.removed).toBe(true);
});
it("keeps the current travel position when speed changes", () => {
  const tour = start();
  advance(18000);
  const progress = state.progress;
  tour.setSpeed(8);
  expect(state.progress).toBeCloseTo(progress, 2);
  tour.destroy();
});
it("can switch flights while paused without leaving the camera behind", () => {
  const tour = start();
  advance(9000);
  tour.pause();
  tour.select(1);
  expect(state.index).toBe(1);
  expect(state.playing).toBe(false);
  expect(state.progress).toBe(0);
  expect(center[1]).toBeGreaterThan(30);
  tour.destroy();
});

it.each([2, 4, 8])(
  "runs approach, travel and arrival at %i times the base clock",
  (rate) => {
    const sample = (speed: number, duration: number) => {
      center = [118, 28];
      zoom = 2.5;
      const tour = start();
      tour.setSpeed(speed);
      advance(1000 / 60); // Prime the animation clock without advancing it.
      advance(duration);
      tour.pause(); // Publish the exact final position, not the throttled UI sample.
      const result = { ...state, center: [...center], zoom };
      tour.destroy();
      return result;
    };
    for (const elapsed of [2000, 18000, 31000]) {
      const base = sample(1, elapsed);
      const faster = sample(rate, elapsed / rate);
      expect(faster.phase).toBe(base.phase);
      expect(faster.progress).toBeCloseTo(base.progress, 6);
      expect(faster.center[0]).toBeCloseTo(base.center[0], 6);
      expect(faster.center[1]).toBeCloseTo(base.center[1], 6);
      expect(faster.zoom).toBeCloseTo(base.zoom, 6);
    }
    expect(sample(rate, 35000 / rate).index).toBe(1);
  },
);
it("changes speed in place during approach, travel, arrival and pause", () => {
  const tour = start();
  for (const delta of [2000, 16000, 13000]) {
    advance(delta);
    // publish immediately before comparing, bypassing the UI throttle
    tour.setSpeed(1);
    const before = { ...state, center: [...center], zoom };
    tour.setSpeed(8);
    expect(state.phase).toBe(before.phase);
    expect(state.progress).toBe(before.progress);
    expect(center).toEqual(before.center);
    expect(zoom).toBe(before.zoom);
    tour.setSpeed(1);
  }
  tour.pause();
  const progress = state.progress;
  tour.setSpeed(2);
  advance(9000);
  expect(state.progress).toBe(progress);
  expect(state.playing).toBe(false);
  tour.destroy();
});
it("ignores invalid speeds instead of freezing or reversing playback", () => {
  const tour = start();
  for (const rate of [0, -1, Number.NaN, Infinity, 1.6, 3]) tour.setSpeed(rate);
  advance(18000);
  expect(state.phase).toBe("travel");
  expect(state.progress).toBeGreaterThan(0.4);
  expect(state.progress).toBeLessThan(0.6);
  tour.destroy();
});
it("keeps a faster playback paused while hidden and resumes without a leap", () => {
  const tour = start();
  tour.setSpeed(8);
  advance(1800);
  doc.hidden = true;
  doc.dispatchEvent(new Event("visibilitychange"));
  const progress = state.progress;
  advance(60000);
  expect(state.progress).toBe(progress);
  doc.hidden = false;
  doc.dispatchEvent(new Event("visibilitychange"));
  advance(50);
  expect(state.progress - progress).toBeLessThan(0.025);
  tour.destroy();
});
