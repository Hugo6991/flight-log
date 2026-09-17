import { useEffect, useRef, useState, useMemo, lazy, Suspense } from "react";
import {
  Plane,
  Plus,
  Download,
  Upload,
  Search,
  Check,
  ChevronRight,
  X,
  Pencil,
  Trash2,
  RotateCcw,
  ArrowUpRight,
  AlertCircle,
  LoaderCircle,
  MapPin,
  ArrowRight,
  CalendarDays,
  Menu,
  ChevronUp,
  ChevronDown,
  SlidersHorizontal,
  BookOpen,
  Map as MapIcon,
  List,
  PanelRight,
  Play,
} from "lucide-react";
import { applyHistoryUpdate, DATA_REVISION } from "../shared/history-update";
import { routeKey } from "./map-geometry";
import {
  type Airport,
  type Flight,
  flightSchema,
  stateSchema,
  flightKey,
  km,
} from "../shared/model";
const Passport = lazy(() => import("./Passport"));
import FlightRecords from "./FlightRecords";
import { latestReplayFlight } from "./latest-flight";
import {
  countryOptions,
  matchesSearch,
  touchesCountry,
} from "./flight-records";
const FlightMap = lazy(() => import("./FlightMap"));
import { writeSaved, BEFORE_RESTORE_KEY } from "./storage";
import { loadFlightState, isDemoFlight } from "./demo";
import DemoNotice from "./DemoNotice";
const statusLabels = {
  unverified: "待核對",
  flown: "已搭乘",
  upcoming: "未來行程",
  cancelled: "已取消／退票",
  removed: "已移除",
};
const today = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Taipei" });
const fmt = (n: number) => Math.round(n).toLocaleString("zh-TW");
function download(name: string, data: string, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function city(code: string, airports: Record<string, Airport>) {
  return airports[code]?.city || code;
}
function normalStatus(f: Flight): Flight {
  return f.status === "upcoming" && f.date < today()
    ? { ...f, status: "unverified" }
    : f;
}
export default function App() {
  const [page, setPage] = useState(
    location.pathname.replace(/\/$/, "") === "/records" ? "records" : "map",
  );
  const [country, setCountry] = useState("all");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarToggle = useRef<HTMLButtonElement>(null);
  const [mobile, setMobile] = useState(
    () => window.matchMedia("(max-width: 760px)").matches,
  );
  const [mobileDetail, setMobileDetail] = useState<string | null>(null);
  const [recordRoute, setRecordRoute] = useState<string | null>(null);
  const [recordsVersion, setRecordsVersion] = useState(0);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 760px)");
    const update = () => setMobile(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    document.title =
      page === "records"
        ? "飛行紀錄 · Flight Log"
        : "Flight Log · 我的旅行地圖";
  }, [page]);
  useEffect(() => {
    const update = () => {
      setPage(
        location.pathname.replace(/\/$/, "") === "/records" ? "records" : "map",
      );
      setSelected(null);
      setMore(false);
      setMobileDetail(null);
      setRecordRoute(null);
    };
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);
  function navigate(next: "map" | "records") {
    const path = next === "records" ? "/records" : "/";
    if (location.pathname !== path) history.pushState(null, "", path);
    setMobileDetail(null);
    setRecordRoute(null);
    setPage(next);
    setSelected(null);
    setMore(false);
    setExpanded(false);
  }
  const [flights, setFlights] = useState<Flight[]>([]),
    [airports, setAirports] = useState<Record<string, Airport>>({});
  const [dataRevision, setDataRevision] = useState(DATA_REVISION),
    [ready, setReady] = useState(false),
    [expanded, setExpanded] = useState(false),
    [routeFilter, setRouteFilter] = useState<string | null>(null),
    [selectionMode, setSelectionMode] = useState(false);
  const [revision, setRevision] = useState(0),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [toast, setToast] = useState("");
  const [tab, setTab] = useState("flown"),
    [year, setYear] = useState("all"),
    [query, setQuery] = useState(""),
    [selected, setSelected] = useState<string | null>(null),
    [checked, setChecked] = useState<Set<string>>(new Set()),
    [editing, setEditing] = useState<Flight | null>(null),
    [more, setMore] = useState(false),
    [passport, setPassport] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const detailClose = useRef<HTMLButtonElement>(null);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const replayDetails = useRef<HTMLButtonElement>(null);
  const selectionTrigger = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (
        event.key === "Escape" &&
        !event.defaultPrevented &&
        !editing &&
        !passport &&
        !more
      ) {
        if (mobile && mobileDetail) setMobileDetail(null);
        else setSelected(null);
      }
    };
    window.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("keydown", escape);
    };
  }, [selected, editing, passport, more, mobile, mobileDetail]);
  useEffect(() => {
    let disposed = false;
    async function load() {
      try {
        const [loaded, a] = await Promise.all([
          loadFlightState(() =>
            fetch("/api/state").then(async (r) => {
              if (!r.ok) throw new Error("無法讀取航班紀錄，請重新整理。");
              return r.json();
            }),
          ),
          fetch("/airports.json").then((r) => {
            if (!r.ok) throw new Error("無法讀取機場資料，請重新整理。");
            return r.json();
          }),
        ]);
        const original = loaded.state;
        const updated = await applyHistoryUpdate(original);
        if (disposed) return;
        let rev = loaded.revision;
        if (loaded.source === "browser" && updated !== original) {
          localStorage.setItem(
            "flight-log.before-data-update.v1",
            JSON.stringify(original),
          );
          rev = writeSaved(updated, rev);
        }
        setFlights(updated.flights.map(normalStatus));
        setDataRevision(updated.data_revision ?? DATA_REVISION);
        setRevision(rev);
        setAirports(a);
        setReady(true);
      } catch (e) {
        if (!disposed)
          setError(e instanceof Error ? e.message : "暫時無法讀取紀錄");
      } finally {
        if (!disposed) setLoading(false);
      }
    }
    void load();
    return () => {
      disposed = true;
    };
  }, []);
  useEffect(() => {
    if (!more) return;
    const outside = (e: PointerEvent) => {
      if (!(e.target as Element).closest(".more-wrap")) setMore(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMore(false);
        menuTrigger.current?.focus();
      }
    };
    window.addEventListener("pointerdown", outside);
    window.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("pointerdown", outside);
      window.removeEventListener("keydown", escape);
    };
  }, [more]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(t);
  }, [toast]);
  async function save(
    next: Flight[],
    message: string,
    nextDataRevision = dataRevision,
  ) {
    if (busy) return false;
    setBusy(true);
    setError("");
    try {
      const validated = stateSchema.parse({
        schema_version: 1,
        data_revision: nextDataRevision,
        flights: next,
      });
      const nextRevision = writeSaved(validated, revision);
      setFlights(validated.flights);
      setRevision(nextRevision);
      setDataRevision(nextDataRevision);
      setToast(message);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "儲存失敗，請再試一次");
      return false;
    } finally {
      setBusy(false);
    }
  }
  const completed = flights.filter((f) => f.status === "flown"),
    pending = flights.filter((f) => f.status === "unverified");
  const eligible = useMemo(
    () =>
      flights
        .filter((f) => {
          if (tab === "history" && !["unverified", "flown"].includes(f.status))
            return false;
          if (tab === "unverified" && f.status !== "unverified") return false;
          if (tab === "flown" && f.status !== "flown") return false;
          if (tab === "upcoming" && f.status !== "upcoming") return false;
          if (
            tab === "excluded" &&
            !["cancelled", "removed"].includes(f.status)
          )
            return false;
          if (routeFilter && routeKey(f) !== routeFilter) return false;
          if (year !== "all" && !f.date.startsWith(year)) return false;
          return (
            touchesCountry(f, airports, country) &&
            matchesSearch(f, airports, query)
          );
        })
        .sort((a, b) =>
          tab === "upcoming"
            ? a.date.localeCompare(b.date)
            : b.date.localeCompare(a.date),
        ),
    [flights, tab, year, query, airports, routeFilter, country],
  );
  const mapped = useMemo(
    () => eligible.filter((f) => !["cancelled", "removed"].includes(f.status)),
    [eligible],
  );
  const latestFlight = latestReplayFlight(flights, airports);
  function replayLatest() {
    // Recompute at the moment of selection, including after an overnight tab.
    const flight = latestReplayFlight(flights, airports);
    if (!flight) return;
    setTab("flown");
    setYear("all");
    setQuery("");
    setCountry("all");
    setRouteFilter(null);
    setChecked(new Set());
    setSelected(flight.id);
    setMobileDetail(null);
    setExpanded(false);
  }
  const selectedFlight = flights.find((f) => f.id === selected);
  const detail = usePresence(
    selectedFlight && (!mobile || mobileDetail === selectedFlight.id)
      ? selectedFlight
      : null,
  );
  const detailFlight = detail.value;
  useEffect(() => {
    if (detail.open) detailClose.current?.focus({ preventScroll: true });
    else if (mobile && selectedFlight)
      replayDetails.current?.focus({ preventScroll: true });
    else selectionTrigger.current?.focus({ preventScroll: true });
  }, [detail.open]);
  const sum = completed.reduce(
    (n, f) =>
      n +
      (airports[f.from] && airports[f.to]
        ? km(airports[f.from], airports[f.to])
        : 0),
    0,
  );
  const countries = new Set(
    completed.map((f) => airports[f.to]?.country).filter(Boolean),
  ).size;
  const years = [...new Set(flights.map((f) => f.date.slice(0, 4)))]
    .sort()
    .reverse();
  const checkedVisible = eligible.filter((f) => checked.has(f.id));
  function switchTab(value: string) {
    setTab(value);
    setRouteFilter(null);
    setChecked(new Set());
    setSelected(null);
  }
  async function status(ids: string[], status: Flight["status"]) {
    const next = flights.map((f) =>
      ids.includes(f.id) ? { ...f, status, inclusion_basis: undefined } : f,
    );
    if (
      await save(
        next,
        (status === "flown"
          ? "已確認 "
          : status === "removed"
            ? "已移除 "
            : "已更新 ") +
          ids.length +
          " 段航班",
      )
    ) {
      setChecked(new Set());
      if (status === "removed") setSelected(null);
    }
  }
  function add() {
    setEditing({
      id: crypto.randomUUID(),
      date: today(),
      flight: "",
      from: "",
      to: "",
      departure: "",
      arrival: "",
      status: "unverified",
      note: "",
      sources: [{ type: "manual", label: "手動補登" }],
    });
  }
  async function importFile(file: File | undefined) {
    if (!file) return;
    try {
      if (file.size > 2_000_000) throw new Error("備份超過 2 MB");
      const parsed = await applyHistoryUpdate(
        stateSchema.parse(JSON.parse(await file.text())),
      );
      if (
        !window.confirm(
          "這份備份有 " +
            parsed.flights.length +
            " 段航班，將取代此瀏覽器的紀錄。現有資料會保留一份，可從「更多功能」復原。是否還原？",
        )
      )
        return;
      localStorage.setItem(
        BEFORE_RESTORE_KEY,
        JSON.stringify({
          schema_version: 1,
          data_revision: dataRevision,
          flights,
        }),
      );
      const restored = await save(
        { ...parsed, flights: parsed.flights.map(normalStatus) }.flights,
        "已從備份還原 " + parsed.flights.length + " 段航班",
        parsed.data_revision ?? DATA_REVISION,
      );
      if (restored) resetAfterReplacement();
    } catch (e) {
      setError(
        e instanceof Error && e.message.includes("2 MB")
          ? e.message
          : "無法匯入，請選擇此網站匯出的 JSON 備份。",
      );
    } finally {
      if (input.current) input.current.value = "";
    }
  }
  function resetAfterReplacement() {
    setRecordsVersion((value) => value + 1);
    setSelected(null);
    setMobileDetail(null);
    setRecordRoute(null);
    setRouteFilter(null);
    setCountry("all");
    setYear("all");
    setQuery("");
    setTab("flown");
    setChecked(new Set());
    setMore(false);
  }
  async function clearDemo() {
    if (busy) return;
    try {
      localStorage.setItem(
        BEFORE_RESTORE_KEY,
        JSON.stringify({
          schema_version: 1,
          data_revision: dataRevision,
          flights,
        }),
      );
      if (
        await save(
          flights.filter((f) => !isDemoFlight(f)),
          "已清空示範，可從更多功能復原",
        )
      )
        resetAfterReplacement();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "無法保存復原備份，示範資料尚未清空",
      );
    }
  }
  async function undoRestore() {
    try {
      const raw = localStorage.getItem(BEFORE_RESTORE_KEY);
      if (!raw) {
        setToast("目前沒有需要復原的備份");
        return;
      }
      const state = await applyHistoryUpdate(
        stateSchema.parse(JSON.parse(raw)),
      );
      if (
        await save(
          state.flights,
          "已復原還原前的紀錄",
          state.data_revision ?? DATA_REVISION,
        )
      )
        resetAfterReplacement();
    } catch {
      setError("無法讀取還原前的備份，請選擇你匯出的檔案。");
    }
  }

  if (loading)
    return (
      <div className="full-state">
        <Plane size={30} />
        <h1>正在展開你的旅行地圖</h1>
        <LoaderCircle className="spin" size={20} />
      </div>
    );
  if (!ready)
    return (
      <div className="full-state">
        <AlertCircle size={30} />
        <h1>暫時無法開啟紀錄</h1>
        <p>{error}</p>
        <button className="primary" onClick={() => location.reload()}>
          重新載入
        </button>
      </div>
    );
  return (
    <div
      className={
        "app-shell" +
        (expanded ? " sheet-expanded" : "") +
        (selectionMode ? " selecting" : "") +
        (page === "records" ? " records-shell" : "") +
        (selected ? " has-selection" : "") +
        (!sidebarOpen ? " sidebar-collapsed" : "")
      }
    >
      <header className="topbar">
        <div className="navigation-island map-glass">
          <a className="brand" href="/" aria-label="Flight Log 首頁">
            <span className="brand-icon">
              <Plane size={21} />
            </span>
            <div>
              Flight Log<span>我的飛行紀錄</span>
            </div>
          </a>
          <nav className="view-nav" aria-label="主要頁面">
            <a
              href="/"
              aria-current={page === "map" ? "page" : undefined}
              onClick={(e) => {
                if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
                  e.preventDefault();
                  navigate("map");
                }
              }}
            >
              <MapIcon size={16} />
              <span>地圖</span>
            </a>
            <a
              href="/records"
              aria-current={page === "records" ? "page" : undefined}
              onClick={(e) => {
                if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
                  e.preventDefault();
                  navigate("records");
                }
              }}
            >
              <List size={16} />
              <span>飛行紀錄</span>
            </a>
          </nav>
        </div>
        <div className="header-actions map-glass">
          {page === "map" && (
            <button
              ref={sidebarToggle}
              className="secondary sidebar-toggle desktop-action"
              aria-label={sidebarOpen ? "隱藏我的航班" : "顯示我的航班"}
              aria-expanded={sidebarOpen}
              aria-controls="flight-sidebar"
              onClick={() => {
                if (!sidebarOpen) {
                  setSelected(null);
                  setMobileDetail(null);
                }
                setSidebarOpen(!sidebarOpen);
              }}
            >
              <PanelRight size={17} />
              <span>我的航班</span>
            </button>
          )}
          <button
            className="secondary passport-button"
            aria-label="開啟飛行護照"
            onClick={() => setPassport(true)}
          >
            <BookOpen size={16} />
            <span>飛行護照</span>
          </button>
          <button
            className="primary"
            disabled={busy}
            onClick={add}
            aria-label="補登航班"
            title="補登航班"
          >
            <Plus size={16} />
            <span>補登航班</span>
          </button>
          <div className="more-wrap">
            <button
              className="icon-button"
              ref={menuTrigger}
              aria-label="更多功能"
              aria-controls="site-menu"
              aria-expanded={more}
              onClick={() => setMore(!more)}
            >
              <Menu size={19} />
            </button>
            {more && (
              <div className="more-menu map-glass" id="site-menu">
                <nav className="mobile-menu-pages" aria-label="手機主要頁面">
                  <a
                    href="/"
                    aria-current={page === "map" ? "page" : undefined}
                    onClick={(e) => {
                      if (
                        !e.metaKey &&
                        !e.ctrlKey &&
                        !e.shiftKey &&
                        !e.altKey
                      ) {
                        e.preventDefault();
                        navigate("map");
                      }
                    }}
                  >
                    <MapIcon size={18} />
                    地圖
                  </a>
                  <a
                    href="/records"
                    aria-current={page === "records" ? "page" : undefined}
                    onClick={(e) => {
                      if (
                        !e.metaKey &&
                        !e.ctrlKey &&
                        !e.shiftKey &&
                        !e.altKey
                      ) {
                        e.preventDefault();
                        navigate("records");
                      }
                    }}
                  >
                    <List size={18} />
                    飛行紀錄
                  </a>
                  <button
                    onClick={() => {
                      setMore(false);
                      setPassport(true);
                    }}
                  >
                    <BookOpen size={18} />
                    飛行護照
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => {
                      setMore(false);
                      add();
                    }}
                  >
                    <Plus size={18} />
                    補登航班
                  </button>
                </nav>
                <a className="menu-journey-link" href="/journey/">
                  <Play size={17} />
                  旅程放映
                </a>
                <button
                  onClick={() => {
                    download(
                      "flight-log-" + today() + ".json",
                      JSON.stringify(
                        {
                          schema_version: 1,
                          data_revision: dataRevision,
                          flights,
                        },
                        null,
                        2,
                      ),
                      "application/json",
                    );
                    setMore(false);
                  }}
                >
                  <Download size={15} />
                  匯出全部紀錄
                </button>
                <button
                  disabled={busy}
                  onClick={() => {
                    input.current?.click();
                    setMore(false);
                  }}
                >
                  <Upload size={15} />
                  還原備份到此瀏覽器
                </button>
                <button disabled={busy} onClick={() => void undoRestore()}>
                  <RotateCcw size={15} />
                  復原上次還原
                </button>
                <DemoNotice
                  flights={flights}
                  busy={busy}
                  onImport={() => {
                    input.current?.click();
                    setMore(false);
                  }}
                  onClear={() => {
                    setMore(false);
                    void clearDemo();
                  }}
                />
                <p>
                  {busy ? "儲存中…" : "已儲存於此瀏覽器。"}
                  <br />
                  跨裝置請匯出並還原備份。
                </p>
              </div>
            )}
          </div>
        </div>
      </header>
      <input
        ref={input}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(e) => void importFile(e.target.files?.[0])}
      />
      {error && (
        <div className="error-banner" role="alert">
          <AlertCircle size={17} />
          <span>{error}</span>
          <button onClick={() => setError("")} aria-label="關閉錯誤訊息">
            <X size={16} />
          </button>
        </div>
      )}
      {passport && (
        <Suspense fallback={null}>
          <Passport
            flights={flights}
            airports={airports}
            onClose={() => setPassport(false)}
            onSelect={(flight) => {
              setPassport(false);
              navigate("map");
              setCountry("all");
              setTab("flown");
              setQuery("");
              setYear("all");
              setRouteFilter(null);
              setSelected(flight.id);
              setExpanded(false);
            }}
          />
        </Suspense>
      )}
      {page === "records" ? (
        <FlightRecords
          key={`${recordsVersion}:${recordRoute ?? "all"}`}
          flights={flights}
          airports={airports}
          initialRoute={recordRoute}
          busy={busy}
          onEdit={(f) => setEditing({ ...f })}
          onMap={(f) => {
            navigate("map");
            setCountry("all");
            setQuery("");
            setYear("all");
            setRouteFilter(null);
            setTab(
              f.status === "flown"
                ? "flown"
                : f.status === "upcoming"
                  ? "upcoming"
                  : f.status === "unverified"
                    ? "unverified"
                    : "excluded",
            );
            setSelected(f.id);
          }}
        />
      ) : (
        <main className="workspace">
          <section className="map-panel">
            <Suspense
              fallback={
                <div className="map-loading" role="status">
                  正在載入地圖
                </div>
              }
            >
              <FlightMap
                flights={mapped}
                sidebarOpen={sidebarOpen}
                airports={airports}
                selected={selected}
                selectedFlight={selectedFlight}
                onClearSelection={() => {
                  setSelected(null);
                  setMobileDetail(null);
                }}
                onShowDetails={() => setMobileDetail(selected)}
                detailsButtonRef={replayDetails}
                onReplayLatest={latestFlight ? replayLatest : undefined}
                onSelectRoute={(key) => {
                  const flight =
                    selectedFlight && routeKey(selectedFlight) === key
                      ? selectedFlight
                      : mapped.find((f) => routeKey(f) === key);
                  if (flight) {
                    setSelected(flight.id);
                    setMobileDetail(null);
                  }
                  setExpanded(false);
                }}
                onSelectAirport={(code) => {
                  if (mobile) {
                    const flight = mapped.find(
                      (f) => f.from === code || f.to === code,
                    );
                    if (flight) setSelected(flight.id);
                    setMobileDetail(null);
                    return;
                  }
                  setSidebarOpen(true);
                  setQuery(code);
                  setRouteFilter(null);
                  setSelected(null);
                  setExpanded(false);
                }}
              />
            </Suspense>
            <div className="journey-stats map-glass">
              <div>
                <span>已搭乘</span>
                <strong>
                  {fmt(completed.length)}
                  <small>段</small>
                </strong>
              </div>
              <div>
                <span>累計距離</span>
                <strong>
                  {fmt(sum)}
                  <small>km</small>
                </strong>
              </div>
              <div>
                <span>國家／地區</span>
                <strong>
                  {fmt(countries)}
                  <small>個</small>
                </strong>
              </div>
            </div>
            {detailFlight && (
              <div
                className={
                  "flight-detail map-glass" + (detail.open ? " is-open" : "")
                }
                id="flight-detail"
                aria-label="航班詳情"
                inert={!detail.open}
              >
                <button
                  className="detail-close icon-button"
                  ref={detailClose}
                  onClick={() =>
                    mobile ? setMobileDetail(null) : setSelected(null)
                  }
                  aria-label="關閉航班詳情"
                >
                  <X size={18} />
                </button>
                <span className={"status-badge " + detailFlight.status}>
                  {statusLabels[detailFlight.status]}
                </span>
                {detailFlight.inclusion_basis === "historical_order" && (
                  <span className="inclusion-note">依歷史訂單納入</span>
                )}
                <div className="detail-route">
                  <div>
                    <strong>{detailFlight.from}</strong>
                    <span>{city(detailFlight.from, airports)}</span>
                  </div>
                  <Plane size={24} />
                  <div>
                    <strong>{detailFlight.to}</strong>
                    <span>{city(detailFlight.to, airports)}</span>
                  </div>
                </div>
                <div className="detail-meta">
                  <span>
                    <CalendarDays size={14} />
                    {detailFlight.date}
                  </span>
                  <span>{detailFlight.flight || "班號待補"}</span>
                  <span>
                    {airports[detailFlight.from] && airports[detailFlight.to]
                      ? fmt(
                          km(
                            airports[detailFlight.from],
                            airports[detailFlight.to],
                          ),
                        ) + " km"
                      : ""}
                  </span>
                </div>
                <details className="detail-disclosure" key={detailFlight.id}>
                  <summary>
                    航班備註與操作 <ChevronDown size={16} aria-hidden="true" />
                  </summary>
                  {(detailFlight.departure || detailFlight.arrival) && (
                    <div className="detail-times">
                      <span>出發 {detailFlight.departure || "—"}</span>
                      <ArrowRight size={14} />
                      <span>抵達 {detailFlight.arrival || "—"}</span>
                    </div>
                  )}
                  {detailFlight.note && (
                    <p className="detail-note">
                      {detailFlight.note.replace(/^；/, "")}
                    </p>
                  )}
                  <div className="sources">
                    {detailFlight.sources.map((s, i) => (
                      <span key={i}>
                        {s.url && /^https:\/\//.test(s.url) ? (
                          <a href={s.url} target="_blank" rel="noreferrer">
                            {s.label}
                            <ArrowUpRight size={12} />
                          </a>
                        ) : (
                          s.label
                        )}
                      </span>
                    ))}
                  </div>
                  <button
                    className="detail-related"
                    onClick={() => {
                      if (mobile) {
                        navigate("records");
                        setRecordRoute(routeKey(detailFlight));
                        return;
                      }
                      setQuery("");
                      setCountry("all");
                      setYear("all");
                      setTab(
                        ["cancelled", "removed"].includes(detailFlight.status)
                          ? "excluded"
                          : detailFlight.status === "upcoming"
                            ? "upcoming"
                            : "history",
                      );
                      setSidebarOpen(true);
                      setRouteFilter(routeKey(detailFlight));
                      setSelected(null);
                      setExpanded(true);
                    }}
                  >
                    查看同航線紀錄 <ChevronRight size={15} />
                  </button>
                  <div className="detail-actions">
                    {detailFlight.status === "unverified" && (
                      <button
                        disabled={busy}
                        className="primary"
                        onClick={() => void status([detailFlight.id], "flown")}
                      >
                        <Check size={15} />
                        確認已搭乘
                      </button>
                    )}
                    {["removed", "cancelled"].includes(detailFlight.status) && (
                      <button
                        className="secondary"
                        disabled={busy}
                        onClick={() =>
                          void status(
                            [detailFlight.id],
                            detailFlight.date > today()
                              ? "upcoming"
                              : "unverified",
                          )
                        }
                      >
                        <RotateCcw size={15} />
                        恢復待核對
                      </button>
                    )}
                    <button
                      className="secondary"
                      disabled={busy}
                      onClick={() => setEditing({ ...detailFlight })}
                    >
                      <Pencil size={15} />
                      編輯
                    </button>
                    {detailFlight.status !== "removed" && (
                      <button
                        className="icon-button danger"
                        disabled={busy}
                        onClick={() =>
                          void status([detailFlight.id], "removed")
                        }
                        title="移至已排除，可隨時恢復"
                        aria-label="移除這段航班"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </details>
              </div>
            )}
          </section>
          <aside
            className="flight-sidebar map-glass"
            id="flight-sidebar"
            aria-label="航班紀錄"
            inert={!!selected}
          >
            <button
              className="sheet-handle"
              aria-label={expanded ? "收合航班列表" : "展開航班列表"}
              aria-expanded={expanded}
              onClick={() => setExpanded(!expanded)}
            >
              <span />
              {expanded ? <ChevronDown size={17} /> : <ChevronUp size={17} />}
            </button>
            <div className="sidebar-content">
              <div className="sidebar-heading">
                <button
                  className="icon-button sidebar-close"
                  aria-label="收起我的航班"
                  onClick={() => {
                    setSidebarOpen(false);
                    sidebarToggle.current?.focus();
                  }}
                >
                  <X size={18} />
                </button>
                <div>
                  <h2>
                    我的航班
                    <span>
                      {
                        flights.filter(
                          (f) => !["cancelled", "removed"].includes(f.status),
                        ).length
                      }
                    </span>
                  </h2>
                </div>
                <button
                  className="icon-button select-mode"
                  aria-label={selectionMode ? "結束批次選取" : "批次選取航班"}
                  aria-pressed={selectionMode}
                  onClick={() => {
                    setSelectionMode(!selectionMode);
                    setChecked(new Set());
                  }}
                >
                  <SlidersHorizontal size={19} />
                </button>
              </div>
              {pending.length > 0 && (
                <button
                  className="review-banner"
                  onClick={() => {
                    switchTab("unverified");
                    setYear("all");
                    setQuery("");
                  }}
                >
                  <AlertCircle size={16} />
                  <span>還有 {pending.length} 段行程待釐清</span>
                  <ChevronRight size={16} />
                </button>
              )}
              <div className="filter-tabs" role="tablist" aria-label="航班狀態">
                {[
                  ["flown", "已搭乘"],
                  ["history", "全部"],
                  [
                    "unverified",
                    pending.length ? `待核對 ${pending.length}` : "待核對",
                  ],
                  ["upcoming", "未來"],
                  ["excluded", "已排除"],
                ].map(([key, label]) => (
                  <button
                    role="tab"
                    aria-selected={tab === key}
                    className={tab === key ? "active" : ""}
                    key={key}
                    onClick={() => switchTab(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="search-row">
                <label className="search-box">
                  <Search size={16} />
                  <input
                    aria-label="搜尋航班"
                    placeholder="搜尋城市、機場或班號"
                    value={query}
                    onInput={(e) => {
                      setQuery(e.currentTarget.value);
                      setSelected(null);
                      setChecked(new Set());
                    }}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setSelected(null);
                      setChecked(new Set());
                    }}
                  />
                  {query && (
                    <button aria-label="清除搜尋" onClick={() => setQuery("")}>
                      <X size={14} />
                    </button>
                  )}
                </label>
                <select
                  aria-label="篩選年份"
                  value={year}
                  onChange={(e) => {
                    setYear(e.target.value);
                    setSelected(null);
                    setChecked(new Set());
                  }}
                >
                  <option value="all">所有年份</option>
                  {years.map((y) => (
                    <option key={y}>{y}</option>
                  ))}
                </select>
              </div>
              <label className="map-country-filter">
                <MapPin size={15} />
                <select
                  aria-label="地圖國家或地區"
                  value={country}
                  onChange={(e) => {
                    setCountry(e.target.value);
                    setSelected(null);
                    setChecked(new Set());
                    setRouteFilter(null);
                  }}
                >
                  <option value="all">所有國家／地區</option>
                  {countryOptions(flights, airports).map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              {routeFilter && (
                <div className="route-filter">
                  <Plane size={14} />
                  <span>
                    {routeFilter} · {eligible.length} 段
                  </span>
                  <button
                    className="icon-button"
                    aria-label="清除航線篩選"
                    onClick={() => setRouteFilter(null)}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
              <div className="list-toolbar">
                <label>
                  <input
                    type="checkbox"
                    className="batch-checkbox"
                    aria-label="選取目前列表全部航班"
                    checked={
                      eligible.length > 0 &&
                      eligible.every((f) => checked.has(f.id))
                    }
                    onChange={(e) =>
                      setChecked(
                        e.target.checked
                          ? new Set(eligible.map((f) => f.id))
                          : new Set(),
                      )
                    }
                  />
                  {checkedVisible.length
                    ? "已選 " + checkedVisible.length + " 段"
                    : eligible.length + " 段航班"}
                </label>
                {checkedVisible.length > 0 ? (
                  <div>
                    {checkedVisible.some((f) => f.status === "unverified") && (
                      <button
                        disabled={busy}
                        className="batch-confirm"
                        onClick={() =>
                          void status(
                            checkedVisible
                              .filter((f) => f.status === "unverified")
                              .map((f) => f.id),
                            "flown",
                          )
                        }
                      >
                        <Check size={13} />
                        確認搭乘
                      </button>
                    )}
                    <button
                      disabled={busy}
                      className="batch-remove"
                      onClick={() =>
                        void status(
                          checkedVisible.map((f) => f.id),
                          "removed",
                        )
                      }
                    >
                      移除
                    </button>
                  </div>
                ) : (
                  <span>
                    {tab === "upcoming" ? "最近出發在前" : "最新行程在前"}
                  </span>
                )}
              </div>
              <div className="flight-list">
                {eligible.length === 0 ? (
                  <div className="empty-state">
                    <MapPin size={26} />
                    <strong>
                      {tab === "flown"
                        ? "你的旅程，從確認第一班開始"
                        : "這裡還沒有航班"}
                    </strong>
                    <p>
                      {tab === "flown"
                        ? "到「待核對」確認曾搭乘的航班。"
                        : "試著調整篩選條件，或補登一段旅程。"}
                    </p>
                  </div>
                ) : (
                  eligible.map((f, i) => (
                    <div key={f.id}>
                      {(i === 0 ||
                        eligible[i - 1].date.slice(0, 7) !==
                          f.date.slice(0, 7)) && (
                        <div className="month-label">
                          {f.date.slice(0, 4)} 年 {Number(f.date.slice(5, 7))}{" "}
                          月
                        </div>
                      )}
                      <div
                        className={
                          "flight-card " + (selected === f.id ? "selected" : "")
                        }
                      >
                        <label className="flight-select">
                          <input
                            type="checkbox"
                            aria-label={
                              "選取 " + f.date + " " + f.from + " " + f.to
                            }
                            checked={checked.has(f.id)}
                            onChange={(e) =>
                              setChecked((s) => {
                                const n = new Set(s);
                                e.target.checked ? n.add(f.id) : n.delete(f.id);
                                return n;
                              })
                            }
                          />
                        </label>
                        <button
                          className="flight-card-content"
                          onClick={(event) => {
                            selectionTrigger.current = event.currentTarget;
                            setSelected(f.id);
                            setExpanded(false);
                          }}
                          aria-label={f.date + " " + f.from + " 至 " + f.to}
                        >
                          <div className="card-top">
                            <span>
                              {f.date.slice(5).replace("-", " / ")}
                              <i /> {f.flight || "班號待補"}
                            </span>
                            {f.status !== "flown" && (
                              <span className={"status-badge " + f.status}>
                                {statusLabels[f.status]}
                              </span>
                            )}
                            {f.status === "flown" && (
                              <span className="card-distance">
                                {airports[f.from] && airports[f.to]
                                  ? fmt(km(airports[f.from], airports[f.to])) +
                                    " km"
                                  : "已搭乘"}
                              </span>
                            )}
                          </div>
                          <div className="card-route">
                            <div>
                              <strong>{f.from}</strong>
                              <span>{city(f.from, airports)}</span>
                            </div>
                            <div className="route-symbol">
                              <span />
                              <Plane size={15} />
                              <span />
                            </div>
                            <div>
                              <strong>{f.to}</strong>
                              <span>{city(f.to, airports)}</span>
                            </div>
                            <ChevronRight className="card-chevron" size={16} />
                          </div>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>
        </main>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={16} />
          {toast}
        </div>
      )}
      {editing && (
        <FlightForm
          initial={editing}
          airports={airports}
          busy={busy}
          onClose={() => setEditing(null)}
          onSave={async (flight) => {
            const f = { ...flight, inclusion_basis: undefined };
            const duplicate = flights.some(
              (x) =>
                x.id !== f.id &&
                x.status !== "removed" &&
                flightKey(x) === flightKey(f),
            );
            if (duplicate) return "已有相同日期、航線與班號的紀錄。";
            if (
              await save(
                flights.some((x) => x.id === f.id)
                  ? flights.map((x) => (x.id === f.id ? f : x))
                  : [...flights, f],
                "航班已儲存",
              )
            ) {
              setEditing(null);
              setSelected(page === "map" ? f.id : null);
              setCountry("all");
              setExpanded(false);
              setTab(
                f.status === "flown"
                  ? "flown"
                  : f.status === "upcoming"
                    ? "upcoming"
                    : f.status === "unverified"
                      ? "unverified"
                      : "excluded",
              );
              setQuery("");
              setYear("all");
              setRouteFilter(null);
              return "";
            }
            return "尚未儲存，請查看上方錯誤訊息。";
          }}
        />
      )}
    </div>
  );
}
function usePresence<T>(value: T | null) {
  const [retained, setRetained] = useState(value);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let frame = 0,
      timer = 0;
    if (value) {
      setRetained(value);
      frame = requestAnimationFrame(() => setOpen(true));
    } else {
      setOpen(false);
      timer = window.setTimeout(() => setRetained(null), 180);
    }
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [value]);
  return { value: retained, open };
}
function FlightForm({
  initial,
  airports,
  busy,
  onClose,
  onSave,
}: {
  initial: Flight;
  airports: Record<string, Airport>;
  busy: boolean;
  onClose: () => void;
  onSave: (f: Flight) => Promise<string>;
}) {
  const [form, setForm] = useState(initial),
    [error, setError] = useState("");
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  function field<K extends keyof Flight>(key: K, value: Flight[K]) {
    setForm((s) => ({ ...s, [key]: value }));
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = flightSchema.safeParse(form);
    if (!parsed.success) {
      setError(
        parsed.error.issues[0].message === "出發與抵達機場不能相同"
          ? "出發與抵達機場不能相同"
          : "請填入正確的日期與三碼機場代碼。",
      );
      return;
    }
    if (!airports[form.from] || !airports[form.to]) {
      setError("找不到這個機場代碼，請從機場建議選擇。");
      return;
    }
    if (form.status === "flown" && form.date > today()) {
      setError("未來航班請先標記為「未來行程」。");
      return;
    }
    setError(await onSave(parsed.data));
  }
  return (
    <dialog
      className="flight-modal map-glass"
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
    >
      <form onSubmit={(e) => void submit(e)}>
        <div className="modal-title">
          <div>
            <h2>{initial.from ? "編輯飛行紀錄" : "補上一段旅程"}</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            disabled={busy}
            onClick={onClose}
            aria-label="關閉編輯"
          >
            <X size={20} />
          </button>
        </div>
        <div className="form-grid">
          <label>
            出發日期
            <input
              autoFocus
              required
              type="date"
              value={form.date}
              onInput={(e) => field("date", e.currentTarget.value)}
              onChange={(e) => field("date", e.target.value)}
            />
          </label>
          <label>
            航班編號 <small>可留空</small>
            <input
              placeholder="例如 BR 715"
              value={form.flight}
              maxLength={20}
              onChange={(e) => field("flight", e.target.value.toUpperCase())}
            />
          </label>
          <label>
            出發機場
            <input
              required
              list="airport-options"
              placeholder="例如 TPE"
              value={form.from}
              maxLength={3}
              onChange={(e) => field("from", e.target.value.toUpperCase())}
            />
            <small>{airports[form.from]?.city || "三碼機場代碼"}</small>
          </label>
          <label>
            抵達機場
            <input
              required
              list="airport-options"
              placeholder="例如 NRT"
              value={form.to}
              maxLength={3}
              onChange={(e) => field("to", e.target.value.toUpperCase())}
            />
            <small>{airports[form.to]?.city || "三碼機場代碼"}</small>
          </label>
          <label>
            出發時間 <small>可留空</small>
            <input
              placeholder="當地時間 10:30"
              value={form.departure}
              maxLength={30}
              onChange={(e) => field("departure", e.target.value)}
            />
          </label>
          <label>
            抵達時間 <small>可留空</small>
            <input
              placeholder="當地時間 14:45"
              value={form.arrival}
              maxLength={30}
              onChange={(e) => field("arrival", e.target.value)}
            />
          </label>
          <label className="full-width">
            紀錄狀態
            <select
              value={form.status}
              onChange={(e) =>
                field("status", e.target.value as Flight["status"])
              }
            >
              {Object.entries(statusLabels).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="full-width">
            備註 <small>可留空</small>
            <textarea
              rows={3}
              value={form.note}
              maxLength={4000}
              placeholder="留一點旅程的記憶，或註記需要核對的資訊。"
              onChange={(e) => field("note", e.target.value)}
            />
          </label>
        </div>
        <datalist id="airport-options">
          {Object.values(airports).map((a) => (
            <option key={a.code} value={a.code}>
              {a.city + " · " + a.name}
            </option>
          ))}
        </datalist>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-footer">
          <span>時間以原始紀錄為準</span>
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={onClose}
          >
            取消
          </button>
          <button className="primary" type="submit" disabled={busy}>
            {busy ? "儲存中…" : "儲存航班"}
            <Check size={15} />
          </button>
        </div>
      </form>
    </dialog>
  );
}
