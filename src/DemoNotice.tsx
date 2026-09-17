import type { Flight } from "../shared/model";
import { demoLabel } from "./demo";
import "./demo.css";

export default function DemoNotice({
  flights,
  busy,
  onImport,
  onClear,
}: {
  flights: Flight[];
  busy: boolean;
  onImport(): void;
  onClear(): void;
}) {
  const label = demoLabel(flights);
  if (!label) return null;
  return (
    <aside className="demo-notice" aria-label="示範資料說明">
      <div>
        <strong>{label}</strong>
        <span>可全部替換成自己的紀錄</span>
      </div>
      <div className="demo-actions">
        <button disabled={busy} onClick={onImport}>
          匯入自己的紀錄
        </button>
        <button disabled={busy} onClick={onClear}>
          清空示範
        </button>
      </div>
    </aside>
  );
}
