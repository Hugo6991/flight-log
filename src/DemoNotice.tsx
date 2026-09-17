import type { Flight } from "../shared/model";
import { demoLabel } from "./demo";
import { Info, ChevronDown, Upload, Trash2 } from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "./components/ui/popover";
import "./components/ui/ui.css";
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
      <Popover>
        <PopoverTrigger asChild>
          <button
            className="demo-trigger map-glass"
            aria-label={`${label}，管理示範資料`}
          >
            <Info size={14} aria-hidden="true" />
            <strong>{label}</strong>
            <ChevronDown size={14} aria-hidden="true" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="demo-popover map-glass"
          align="start"
          aria-label="管理示範資料"
          onEscapeKeyDown={(event) => event.stopPropagation()}
        >
          <strong>{label}</strong>
          <p>可全部替換成自己的紀錄</p>
          <div className="demo-actions">
            <button disabled={busy} onClick={onImport}>
              <Upload size={16} aria-hidden="true" />
              匯入自己的紀錄
            </button>
            <button disabled={busy} onClick={onClear}>
              <Trash2 size={16} aria-hidden="true" />
              清空示範
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </aside>
  );
}
