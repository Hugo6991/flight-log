import { useLayoutEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Globe2,
  Map as MapIcon,
  PanelBottom,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  X,
} from "lucide-react";
import type { Airport, Flight } from "../../shared/model";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { SegmentedControl } from "../components/ui/segmented-control";
import FlightPicker from "./FlightPicker";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../components/ui/collapsible";
import "../components/ui/ui.css";
import type { TourState } from "./controller";

const preferenceKey = "flight-log.ui.journey-panel.v1";
function initialOpen() {
  try {
    const saved = localStorage.getItem(preferenceKey);
    if (saved === "open" || saved === "closed") return saved === "open";
  } catch {
    /* Storage may be unavailable; the control still works. */
  }
  return !matchMedia("(max-width: 760px)").matches;
}

type Props = {
  flights: Flight[];
  airports: Record<string, Airport>;
  tour: TourState;
  ready: boolean;
  earth: boolean;
  speed: string;
  onMapChange(): void;
  onToggle(): void;
  onStep(delta: number): void;
  onSelect(index: number): void;
  onSpeed(value: string): void;
};

export default function JourneyControls({
  flights,
  airports,
  tour,
  ready,
  earth,
  speed,
  onMapChange,
  onToggle,
  onStep,
  onSelect,
  onSpeed,
}: Props) {
  const [open, setOpen] = useState(initialOpen);
  const [keyboard, setKeyboard] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const focusRequested = useRef(false);
  const flight = flights[tour.index];
  const toggleLabel = tour.playing ? "暫停放映" : "繼續放映";
  function changeOpen(next: boolean) {
    focusRequested.current = true;
    setOpen(next);
    try {
      localStorage.setItem(preferenceKey, next ? "open" : "closed");
    } catch {
      /* Session-only fallback. */
    }
  }
  useLayoutEffect(() => {
    if (!focusRequested.current) return;
    focusRequested.current = false;
    (open ? close : trigger).current?.focus({ preventScroll: true });
  }, [open]);

  return (
    <Collapsible
      className="flight-ui camera-ui"
      data-keyboard={keyboard}
      open={open}
      onOpenChange={changeOpen}
      onPointerDownCapture={() => setKeyboard(false)}
      onKeyDownCapture={() => setKeyboard(true)}
    >
      <header className="camera-header">
        <a
          className="ui-button camera-back map-glass"
          data-size="icon"
          href="/"
          aria-label="返回旅行地圖"
          title="返回旅行地圖"
        >
          <ArrowLeft aria-hidden="true" />
        </a>
        <div className="camera-title">
          <strong>旅程放映</strong>
          <span>
            {flight.from} → {flight.to}
          </span>
        </div>
        <Card
          material="glass"
          className="camera-toolbar map-glass"
          role="group"
          aria-label="地圖與放映控制"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            disabled={!ready || tour.reduced}
            aria-label={toggleLabel}
            title={toggleLabel}
          >
            {tour.playing ? (
              <Pause aria-hidden="true" />
            ) : (
              <Play aria-hidden="true" />
            )}
          </Button>
          <CollapsibleTrigger asChild>
            <Button
              ref={trigger}
              variant="ghost"
              size="icon"
              aria-label={open ? "隱藏航班卡片" : "顯示航班卡片"}
              title={open ? "隱藏航班卡片" : "顯示航班卡片"}
            >
              <PanelBottom aria-hidden="true" />
            </Button>
          </CollapsibleTrigger>
          <span className="camera-toolbar-divider" aria-hidden="true" />
          <Button
            variant="ghost"
            size="icon"
            onClick={onMapChange}
            disabled={!ready}
            aria-label={earth ? "切換簡潔地圖" : "切換地球影像"}
            title={earth ? "切換簡潔地圖" : "切換地球影像"}
          >
            {earth ? (
              <MapIcon aria-hidden="true" />
            ) : (
              <Globe2 aria-hidden="true" />
            )}
          </Button>
        </Card>
      </header>
      <CollapsibleContent
        forceMount
        className="camera-console ui-disclosure"
        inert={!open}
        aria-hidden={!open}
        onKeyDown={(event) => {
          if (event.key === "Escape" && !event.defaultPrevented) {
            event.preventDefault();
            event.stopPropagation();
            changeOpen(false);
          }
        }}
      >
        <Card
          material="glass"
          className="camera-console-card map-glass"
          role="region"
          aria-label="旅程播放控制"
        >
          <div className="camera-card-heading">
            <FlightPicker
              flights={flights}
              airports={airports}
              currentId={flight.id}
              disabled={!ready}
              visible={open}
              onSelect={onSelect}
            >
              <span className="camera-flight-summary">
                <span className="camera-route">
                  <strong>{flight.from}</strong>
                  <ArrowRight aria-hidden="true" />
                  <strong>{flight.to}</strong>
                </span>
                <span className="camera-metadata">
                  <time dateTime={flight.date}>
                    {flight.date.replaceAll("-", ".")}
                  </time>
                  {flight.flight && <span> · {flight.flight}</span>}
                </span>
              </span>
              <span className="ui-sr-only">
                {airports[flight.from].city} 至 {airports[flight.to].city}， 第{" "}
                {tour.index + 1} 段，共 {flights.length} 段
              </span>
            </FlightPicker>
            <Button
              ref={close}
              variant="ghost"
              size="icon"
              onClick={() => changeOpen(false)}
              aria-label="關閉航班卡片"
              title="關閉航班卡片"
            >
              <X aria-hidden="true" />
            </Button>
          </div>
          <div
            className="camera-progress"
            role="progressbar"
            aria-label="此段航班回放進度"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(tour.progress * 100)}
          >
            <div style={{ transform: `scaleX(${tour.progress})` }} />
          </div>
          <div className="camera-playback">
            <div
              className="camera-buttons"
              role="group"
              aria-label="切換與播放航班"
            >
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onStep(-1)}
                disabled={!ready}
                aria-label="上一段航班"
                title="上一段航班"
              >
                <SkipBack aria-hidden="true" />
              </Button>
              <Button
                variant="default"
                size="icon"
                onClick={onToggle}
                disabled={!ready || tour.reduced}
                aria-label={toggleLabel}
                title={toggleLabel}
              >
                {tour.playing ? (
                  <Pause aria-hidden="true" />
                ) : (
                  <Play aria-hidden="true" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onStep(1)}
                disabled={!ready}
                aria-label="下一段航班"
                title="下一段航班"
              >
                <SkipForward aria-hidden="true" />
              </Button>
            </div>
            <SegmentedControl
              label="放映速度"
              disabled={!ready || tour.reduced}
              value={speed}
              onValueChange={onSpeed}
              options={[
                { value: "1", label: "1×", accessibleLabel: "1 倍速" },
                { value: "2", label: "2×", accessibleLabel: "2 倍速" },
                { value: "3", label: "3×", accessibleLabel: "3 倍速" },
              ]}
            />
          </div>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}
