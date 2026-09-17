import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowRight, Check, ChevronsUpDown, Search, X } from "lucide-react";
import type { Airport, Flight } from "../../shared/model";
import { Button } from "../components/ui/button";
import { Command } from "../components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";

type Props = {
  children: ReactNode;
  flights: Flight[];
  airports: Record<string, Airport>;
  currentId: string;
  disabled: boolean;
  visible: boolean;
  onSelect(index: number): void;
};

export default function FlightPicker({
  children,
  flights,
  airports,
  currentId,
  disabled,
  visible,
  onSelect,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(currentId);
  const input = useRef<HTMLInputElement>(null);
  const groups = useMemo(() => {
    const months = new Map<string, { flight: Flight; index: number }[]>();
    flights.forEach((flight, index) => {
      const month = flight.date.slice(0, 7);
      if (!months.has(month)) months.set(month, []);
      months.get(month)!.push({ flight, index });
    });
    return [...months];
  }, [flights]);
  useEffect(() => {
    if (!visible) setOpen(false);
  }, [visible]);

  return (
    <Popover
      open={open && visible}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setQuery("");
          setActive(currentId);
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="camera-picker-trigger"
          disabled={disabled}
          aria-label="切換航班"
          title="搜尋與切換航班"
        >
          {children}
          <ChevronsUpDown aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        className="camera-flight-menu"
        aria-label="切換回放航班"
        onCloseAutoFocus={(event) => {
          if (!visible) event.preventDefault();
        }}
        onKeyDown={(event) => {
          // The first Escape belongs to this menu, not the surrounding card.
          if (event.key === "Escape") event.stopPropagation();
        }}
      >
        <Command
          label="搜尋航班"
          value={active}
          onValueChange={setActive}
          loop
          filter={(_value, search, keywords) => {
            const normalize = (text: string) =>
              text.toLocaleLowerCase().replace(/[./]/g, "-");
            const text = normalize((keywords ?? []).join(" "));
            return normalize(search)
              .trim()
              .split(/\s+/)
              .every((word) => text.includes(word))
              ? 1
              : 0;
          }}
        >
          <div className="ui-command-search">
            <Search size={18} aria-hidden="true" />
            <Command.Input
              ref={input}
              value={query}
              onValueChange={setQuery}
              placeholder="城市、機場、班號或日期"
              aria-label="搜尋城市、機場、班號或日期"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
            {query && (
              <Button
                variant="ghost"
                size="icon"
                aria-label="清除搜尋"
                onClick={() => {
                  setQuery("");
                  input.current?.focus();
                }}
              >
                <X aria-hidden="true" />
              </Button>
            )}
          </div>
          <Command.List label="歷史航班">
            <Command.Empty aria-live="polite">找不到相符航班</Command.Empty>
            {groups.map(([month, items]) => (
              <Command.Group
                key={month}
                heading={`${month.slice(0, 4)} 年 ${Number(month.slice(5))} 月`}
              >
                {items.map(({ flight, index }) => {
                  const from = airports[flight.from].city;
                  const to = airports[flight.to].city;
                  return (
                    <Command.Item
                      key={flight.id}
                      value={flight.id}
                      keywords={[
                        flight.date,
                        flight.from,
                        flight.to,
                        flight.flight,
                        from,
                        to,
                      ]}
                      aria-label={`${flight.date} ${from} ${flight.from} 至 ${to} ${flight.to} ${flight.flight}${flight.id === currentId ? "，目前航班" : ""}`}
                      onSelect={() => {
                        onSelect(index);
                        setOpen(false);
                      }}
                      className="camera-flight-option"
                    >
                      <time dateTime={flight.date}>
                        {flight.date.slice(5).replace("-", ".")}
                      </time>
                      <span className="camera-flight-option-main">
                        <strong>
                          {flight.from}
                          <ArrowRight size={13} aria-hidden="true" />
                          {flight.to}
                        </strong>
                        <span>
                          {from} → {to}
                          {flight.flight && ` · ${flight.flight}`}
                        </span>
                      </span>
                      {flight.id === currentId && (
                        <Check
                          size={17}
                          className="camera-flight-check"
                          aria-hidden="true"
                        />
                      )}
                    </Command.Item>
                  );
                })}
              </Command.Group>
            ))}
          </Command.List>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
