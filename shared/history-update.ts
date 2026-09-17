import type { FlightState } from "./model";
export const DATA_REVISION = 0;
// A clean starter has no author-specific history corrections.
export async function applyHistoryUpdate(state: FlightState): Promise<FlightState> { return state; }
