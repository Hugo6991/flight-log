import { stateSchema, type FlightState } from "../shared/model";
// A reused domain must not load personal records left by its previous application.
// Other existing domains keep their original storage keys and visitor edits.
export function storageKeys(
  origin: string | undefined,
  isolatedOrigin: string | undefined,
) {
  const scope = isolatedOrigin && origin === isolatedOrigin ? "public." : "";
  return {
    state: `flight-log.${scope}browser.v1`,
    backup: `flight-log.${scope}before-restore.v1`,
  };
}
const keys = storageKeys(
  globalThis.location?.origin,
  import.meta.env.VITE_STORAGE_SCOPE_ORIGIN,
);
export const STORAGE_KEY = keys.state;
export const BEFORE_RESTORE_KEY = keys.backup;
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
