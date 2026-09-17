import { useMemo, useState } from "react";
import {
  Search,
  ArrowUpRight,
  Pencil,
  Plane,
  ArrowRight,
  FileSearch,
  X,
  ChevronDown,
} from "lucide-react";
import { routeKey } from "./map-geometry";
import { km, type Airport, type Flight } from "../shared/model";
import {
  countryOptions,
  matchesSearch,
  statusLabels,
  touchesCountry,
  travelGaps,
} from "./flight-records";
const fmt = (n: number) => Math.round(n).toLocaleString("zh-TW");
export default function FlightRecords({
  flights,
  airports,
  onEdit,
  onMap,
  busy,
  initialRoute = null,
}: {
  flights: Flight[];
  airports: Record<string, Airport>;
  onEdit: (f: Flight) => void;
  onMap: (f: Flight) => void;
  busy: boolean;
  initialRoute?: string | null;
}) {
  const [route, setRoute] = useState(initialRoute);
  const [query, setQuery] = useState(""),
    [year, setYear] = useState("all"),
    [country, setCountry] = useState("all"),
    [status, setStatus] = useState("all"),
    [missing, setMissing] = useState(false),
    [ascending, setAscending] = useState(false);
  const countries = useMemo(
    () => countryOptions(flights, airports),
    [flights, airports],
  );
  const years = [
    ...new Set([
      ...flights.map((f) => f.date.slice(0, 4)),
      ...travelGaps.map((g) => g.year),
    ]),
  ]
    .sort()
    .reverse();
  const matching = useMemo(
    () =>
      flights
        .filter(
          (f) =>
            (status === "all" ? f.status !== "removed" : f.status === status) &&
            (year === "all" || f.date.startsWith(year)) &&
            (!route || routeKey(f) === route) &&
            touchesCountry(f, airports, country) &&
            matchesSearch(f, airports, query),
        )
        .sort(
          (a, b) =>
            (ascending ? 1 : -1) *
            (a.date.localeCompare(b.date) ||
              a.departure.localeCompare(b.departure)),
        ),
    [flights, airports, status, year, country, query, ascending, route],
  );
  const visible = missing ? matching.filter((f) => !f.flight.trim()) : matching;
  const incomplete = matching.filter((f) => !f.flight.trim()).length;
  const gaps = (route ? [] : travelGaps).filter(
    (g) =>
      (country === "all" || country === g.country) &&
      (year === "all" || year === g.year) &&
      (!query.trim() ||
        g.match.toLowerCase().includes(query.trim().toLowerCase())),
  );
  function reset() {
    setRoute(null);
    setQuery("");
    setYear("all");
    setCountry("all");
    setStatus("all");
    setMissing(false);
  }
  return (
    <main className="records-page" id="records-main">
      <div className="records-container">
        <div className="records-heading">
          <div>
            <span className="records-eyebrow">我的旅行收藏</span>
            <h1>飛行紀錄</h1>
            <p>每一次出發，都有跡可循。</p>
          </div>
          <div className="records-total">
            <strong>
              {flights.filter((f) => f.status === "flown").length}
            </strong>
            <span>段已搭乘</span>
          </div>
        </div>
        {route && (
          <button
            className="records-route-filter secondary"
            onClick={() => setRoute(null)}
          >
            {route.replace("–", " ↔ ")} · 同航線紀錄{" "}
            <X size={16} aria-label="清除航線篩選" />
          </button>
        )}
        <div className="records-filters">
          <label className="search-box">
            <Search size={17} />
            <input
              aria-label="搜尋飛行紀錄"
              placeholder="搜尋城市、國家、機場或班號"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button aria-label="清除紀錄搜尋" onClick={() => setQuery("")}>
                <X size={16} />
              </button>
            )}
          </label>
          <label className="record-filter">
            <span>年份</span>
            <select
              aria-label="紀錄年份"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            >
              <option value="all">所有年份</option>
              {years.map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
          </label>
          <label className="record-filter">
            <span>國家／地區</span>
            <select
              aria-label="紀錄國家或地區"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            >
              <option value="all">所有地方</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="record-filter">
            <span>狀態</span>
            <select
              aria-label="紀錄狀態"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">全部紀錄</option>
              {Object.entries(statusLabels).map(([s, l]) => (
                <option key={s} value={s}>
                  {l}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="records-toolbar">
          <span aria-live="polite">{visible.length} 段紀錄</span>
          <button
            className={"missing-toggle" + (missing ? " active" : "")}
            aria-pressed={missing}
            onClick={() => setMissing(!missing)}
          >
            <FileSearch size={15} />
            {missing ? "正在查看班號待補" : `班號待補 ${incomplete}`}
            <ChevronDown size={14} />
          </button>
          <button
            className="records-sort"
            onClick={() => setAscending(!ascending)}
          >
            {ascending ? "最早出發在前" : "最新出發在前"}
          </button>
        </div>
        {gaps.length > 0 && (
          <details className="travel-gaps">
            <summary>
              <FileSearch size={17} />
              <span>旅行線索 · {gaps.length} 筆航班待補</span>
              <small>尚未計入里程</small>
              <ChevronDown size={16} />
            </summary>
            <div className="gap-items">
              {gaps.map((g) => (
                <article key={g.id}>
                  <div>
                    <strong>{g.title}</strong>
                    <span>{g.period}</span>
                  </div>
                  <p>{g.detail}</p>
                  <small>來源：{g.source}</small>
                </article>
              ))}
            </div>
          </details>
        )}
        <div className="records-table-wrap">
          <table className="records-table">
            <caption className="sr-only">
              飛行紀錄：日期、航線、班號、當地時間與狀態
            </caption>
            <thead>
              <tr>
                <th scope="col">出發日期</th>
                <th scope="col">航線</th>
                <th scope="col">班號</th>
                <th scope="col">出發／抵達</th>
                <th scope="col">狀態</th>
                <th scope="col">
                  <span className="sr-only">操作</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((f) => (
                <tr key={f.id}>
                  <td className="record-date">
                    <time dateTime={f.date}>{f.date}</time>
                    <small>
                      {airports[f.from] && airports[f.to]
                        ? `${fmt(km(airports[f.from], airports[f.to]))} km`
                        : "距離待補"}
                    </small>
                  </td>
                  <td className="record-route">
                    <div>
                      <strong>{f.from}</strong>
                      <ArrowRight size={16} />
                      <strong>{f.to}</strong>
                    </div>
                    <small>
                      {airports[f.from]?.city || f.from} →{" "}
                      {airports[f.to]?.city || f.to}
                    </small>
                  </td>
                  <td className="record-flight">
                    <strong className={!f.flight ? "is-missing" : ""}>
                      {f.flight || "班號待補"}
                    </strong>
                    <small>
                      {f.sources.some((s) => s.type === "gmail")
                        ? "有航班郵件"
                        : f.sources.some((s) => s.type === "trip_export")
                          ? "訂單匯出"
                          : "手動紀錄"}
                    </small>
                  </td>
                  <td className="record-times">
                    <span>
                      {f.departure || "—"} → {f.arrival || "—"}
                    </span>
                    <small>當地時間</small>
                  </td>
                  <td className="record-status">
                    <span className={"status-badge " + f.status}>
                      {statusLabels[f.status]}
                    </span>
                  </td>
                  <td className="record-actions">
                    <button
                      aria-label={`在地圖查看 ${f.date} ${f.from} 至 ${f.to}`}
                      title="在地圖查看"
                      onClick={() => onMap(f)}
                    >
                      <ArrowUpRight size={18} />
                      <span>地圖</span>
                    </button>
                    <button
                      disabled={busy}
                      aria-label={`編輯 ${f.date} ${f.from} 至 ${f.to}`}
                      title="編輯紀錄"
                      onClick={() => onEdit(f)}
                    >
                      <Pencil size={16} />
                      <span>編輯</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {visible.length === 0 && (
            <div className="records-empty">
              <Plane size={28} />
              <h2>沒有符合條件的航班</h2>
              <p>可調整年份、國家或搜尋條件。</p>
              <button className="secondary" onClick={reset}>
                清除篩選
              </button>
            </div>
          )}
        </div>
        <p className="records-footnote">
          取消、退票與待核對行程不計入累計里程。距離為機場間大圓估算。
          <br />
          目前依已有郵件與訂單整理，仍有缺漏；修改會保存在此瀏覽器。
        </p>
      </div>
    </main>
  );
}
