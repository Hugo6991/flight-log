import { beforeEach, afterEach, it, expect, vi } from "vitest";
import type { Map as LibreMap } from "maplibre-gl";
import { startReplay } from "./route-replay";
const markerState = vi.hoisted(() => ({
  position: [] as number[],
  removed: false,
}));
vi.mock("maplibre-gl", () => ({
  Marker: class {
    setLngLat(value: number[]) {
      markerState.position = value;
      return this;
    }
    setRotation() {
      return this;
    }
    addTo() {
      return this;
    }
    remove() {
      markerState.removed = true;
    }
  },
}));
let frames: Map<number, FrameRequestCallback>,
  nextId: number,
  now: number,
  motion: EventTarget & { matches: boolean },
  doc: EventTarget & { hidden: boolean; createElement: () => unknown };
const map = {
  getSource: () => ({ setData: vi.fn() }),
  setPaintProperty: vi.fn(),
} as unknown as LibreMap;
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
  frames = new globalThis.Map();
  nextId = 0;
  now = 100;
  markerState.removed = false;
  motion = Object.assign(new EventTarget(), { matches: false });
  doc = Object.assign(new EventTarget(), {
    hidden: false,
    createElement: () => ({
      setAttribute: vi.fn(),
      innerHTML: "",
      className: "",
    }),
  });
  vi.stubGlobal("document", doc);
  vi.stubGlobal("window", { matchMedia: () => motion });
  vi.stubGlobal("requestAnimationFrame", (fn: FrameRequestCallback) => {
    frames.set(++nextId, fn);
    return nextId;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
});
afterEach(() => vi.unstubAllGlobals());
const points: [number, number][] = [
  [0, 0],
  [10, 0],
];
it("completes the same trip at 30 and 120 Hz with no endless loop", () => {
  for (const hz of [30, 120]) {
    const phase = vi.fn();
    const replay = startReplay(map, points, 1000, phase, vi.fn());
    advance(12000, hz);
    expect(markerState.position).toEqual([10, 0]);
    expect(phase).toHaveBeenLastCalledWith("finished");
    expect(frames.size).toBe(0);
    replay.destroy();
  }
});
it("pauses, resumes, restarts and cleans up a replaced selection", () => {
  const replay = startReplay(map, points, 1000, vi.fn(), vi.fn());
  advance(1600);
  replay.toggle();
  const paused = [...markerState.position];
  advance(2000);
  expect(markerState.position).toEqual(paused);
  replay.toggle();
  advance(800);
  expect(markerState.position[0]).toBeGreaterThan(paused[0]);
  replay.restart();
  expect(markerState.position).toEqual([0, 0]);
  replay.destroy();
  expect(frames.size).toBe(0);
  expect(markerState.removed).toBe(true);
});
it("does not animate with reduced motion, including when changed mid-flight", () => {
  motion.matches = true;
  const phase = vi.fn();
  const replay = startReplay(map, points, 1000, phase, vi.fn());
  expect(frames.size).toBe(0);
  expect(markerState.position).toEqual([10, 0]);
  expect(phase).toHaveBeenLastCalledWith("reduced");
  motion.matches = false;
  motion.dispatchEvent(new Event("change"));
  expect(phase).toHaveBeenLastCalledWith("finished");
  expect(frames.size).toBe(0);
  replay.toggle();
  expect(frames.size).toBe(1);
  replay.destroy();
  motion.matches = false;
  const second = startReplay(map, points, 1000, phase, vi.fn());
  advance(1000);
  motion.matches = true;
  motion.dispatchEvent(new Event("change"));
  expect(frames.size).toBe(0);
  expect(markerState.position).toEqual([10, 0]);
  second.destroy();
});
it("suspends in a hidden tab without skipping the journey on return", () => {
  const replay = startReplay(map, points, 1000, vi.fn(), vi.fn());
  advance(1600);
  doc.hidden = true;
  doc.dispatchEvent(new Event("visibilitychange"));
  const paused = [...markerState.position];
  advance(10000);
  expect(markerState.position).toEqual(paused);
  doc.hidden = false;
  doc.dispatchEvent(new Event("visibilitychange"));
  advance(16);
  expect(markerState.position).toEqual(paused);
  replay.destroy();
});

it("moves visibly within the first 100ms without a departure delay", () => {
  const replay = startReplay(map, points, 1000, vi.fn(), vi.fn());
  advance(100);
  expect(markerState.position[0]).toBeGreaterThan(0.08);
  replay.destroy();
});
