import { stateSchema, type FlightState } from "../shared/model";
export const STORAGE_KEY = "flight-log.browser.v1";
export const BEFORE_RESTORE_KEY = "flight-log.before-restore.v1";
type Store = Pick<Storage, "getItem" | "setItem">;
export function readSaved(
  storage: Store = localStorage,
): { state: FlightState; revision: number } | null {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  return {
    state: stateSchema.parse(parsed),
    revision: Number.isSafeInteger(parsed.revision) ? parsed.revision : 0,
  };
}
export function writeSaved(
  state: FlightState,
  revision: number,
  storage: Store = localStorage,
) {
  const current = readSaved(storage);
  if ((current?.revision || 0) !== revision)
    throw new Error("另一個分頁已更新紀錄，請重新整理後再試。");
  const valid = stateSchema.parse(state),
    next = revision + 1;
  storage.setItem(STORAGE_KEY, JSON.stringify({ ...valid, revision: next }));
  return next;
}
