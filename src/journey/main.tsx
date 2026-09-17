import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { type Airport, type Flight } from "../../shared/model";
import { loadFlightState } from "../demo";
import "../demo.css";
import { applyHistoryUpdate } from "../../shared/history-update";
import { playlist } from "./timeline";
import CameraMap from "./CameraMap";
import "./style.css";
function App() {
  const [data, setData] = useState<{
    flights: Flight[];
    airports: Record<string, Airport>;
  } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    const get = async (path: string) => {
      const response = await fetch(path, { signal: controller.signal });
      if (!response.ok) throw new Error("無法讀取航班資料，請檢查連線後重試");
      return response.json();
    };
    async function load() {
      try {
        const [loaded, airports] = await Promise.all([
          loadFlightState(() => get("/api/state")),
          get("/airports.json"),
        ]);
        const updated = await applyHistoryUpdate(loaded.state);
        if (!controller.signal.aborted)
          setData({ flights: updated.flights, airports });
      } catch (reason) {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error ? reason.message : "暫時無法讀取紀錄",
          );
      }
    }
    void load();
    return () => controller.abort();
  }, []);
  const queue = useMemo(
    () => (data ? playlist(data.flights, data.airports) : []),
    [data],
  );
  if (!data || !queue.length)
    return (
      <div className="camera-empty">
        <h1>旅程放映</h1>
        <p role="status">
          {error || (!data ? "讀取飛行紀錄…" : "目前沒有可回放的已搭乘航班")}
        </p>
        <a href="/">返回旅行地圖</a>
      </div>
    );
  return <CameraMap flights={queue} airports={data.airports} />;
}
const root = createRoot(document.getElementById("root")!);
root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if (import.meta.hot) import.meta.hot.dispose(() => root.unmount());
