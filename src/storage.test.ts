import { it, expect } from "vitest";
import { applyHistoryUpdate } from "../shared/history-update";
import { readSaved, writeSaved } from "./storage";
function store() {
  const values = new Map<string, string>();
  return {
    getItem: (k: string) => values.get(k) || null,
    setItem: (k: string, v: string) => {
      values.set(k, v);
    },
  };
}
const state = { schema_version: 1 as const, flights: [] };
it("persists a browser backup and restores its revision", () => {
  const s = store();
  expect(readSaved(s)).toBe(null);
  expect(writeSaved(state, 0, s)).toBe(1);
  expect(readSaved(s)).toEqual({ state, revision: 1 });
});
it("refuses to overwrite a newer browser-tab version", () => {
  const s = store();
  writeSaved(state, 0, s);
  expect(() => writeSaved(state, 0, s)).toThrow("另一個分頁");
  expect(readSaved(s)?.revision).toBe(1);
});
it("does not report success when browser storage fails", () => {
  expect(() =>
    writeSaved(state, 0, {
      getItem: () => null,
      setItem: () => {
        throw new Error("storage full");
      },
    }),
  ).toThrow("storage full");
});

it("keeps the data revision and manual correction across reload and a legacy storage upgrade", async () => {
  const s = store();
  const manual = {
    id: "manual-trip",
    date: "2024-04-04",
    flight: "TEST",
    from: "TPE",
    to: "NRT",
    departure: "",
    arrival: "",
    status: "removed" as const,
    note: "user correction",
    sources: [{ type: "manual" as const, label: "manual" }],
  };
  writeSaved({ ...state, flights: [manual] }, 0, s);
  const before = readSaved(s)!;
  writeSaved(await applyHistoryUpdate(before.state), before.revision, s);
  const reloaded = readSaved(s)!;
  expect(reloaded.state.data_revision).toBeUndefined();
  expect(reloaded.state.flights).toEqual([manual]);
  expect(await applyHistoryUpdate(reloaded.state)).toBe(reloaded.state);
});
