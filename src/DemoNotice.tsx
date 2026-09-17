import type { Flight } from "../shared/model";
import { demoLabel } from "./demo";
import { Upload, Trash2 } from "lucide-react";
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
    <section className="demo-settings" aria-label="示範資料設定">
      <strong>{label}</strong>
      <button disabled={busy} onClick={onImport}>
        <Upload size={16} aria-hidden="true" />
        匯入自己的紀錄
      </button>
      <button disabled={busy} onClick={onClear}>
        <Trash2 size={16} aria-hidden="true" />
        清空示範
      </button>
    </section>
  );
}
