import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  X,
  Plane,
  ArrowUpRight,
  Download,
  ChevronDown,
  LoaderCircle,
} from "lucide-react";
import type { Flight, Airport } from "../shared/model";
import { passportSummary } from "./travel-summary";
import { countryName } from "./flight-records";
import { passportArt, savePassportImage } from "./passport-art";
import { demoLabel } from "./demo";
import "./passport.css";
const fmt = (n: number) => Math.round(n).toLocaleString("zh-TW");
const flag = (code: string) =>
  /^[A-Z]{2}$/.test(code)
    ? [...code]
        .map((c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
        .join("")
    : code;
export default function Passport({
  flights,
  airports,
  onClose,
  onSelect,
}: {
  flights: Flight[];
  airports: Record<string, Airport>;
  onClose: () => void;
  onSelect: (flight: Flight) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const card = useRef<SVGSVGElement>(null);
  const id = useId().replaceAll(":", "");
  const [year, setYear] = useState("all");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const completed = useMemo(
    () => flights.filter((f) => f.status === "flown"),
    [flights],
  );
  const years = [...new Set(completed.map((f) => f.date.slice(0, 4)))]
    .sort()
    .reverse();
  const collection = useMemo(
    () => completed.filter((f) => year === "all" || f.date.startsWith(year)),
    [completed, year],
  );
  const summary = useMemo(
    () => passportSummary(collection, airports),
    [collection, airports],
  );
  const art = useMemo(
    () => passportArt(collection, airports),
    [collection, airports],
  );
  const period = year === "all" ? "ALL TIME" : year;
  const dataLabel = demoLabel(collection);
  useEffect(() => {
    const node = dialog.current!;
    node.showModal();
    return () => node.close();
  }, []);
  const milestones = summary.first
    ? [
        {
          title: year === "all" ? "紀錄中最早的出發" : "這一年的第一段",
          flight: summary.first,
          meta: summary.first.date,
        },
        ...(summary.longest
          ? [
              {
                title: "飛得最遠的一段",
                flight: summary.longest.flight,
                meta: `${fmt(summary.longest.distance)} km`,
              },
            ]
          : []),
      ]
    : [];
  return (
    <dialog
      className="travel-passport"
      ref={dialog}
      aria-labelledby="passport-title"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const b = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < b.left ||
            e.clientX > b.right ||
            e.clientY < b.top ||
            e.clientY > b.bottom
          )
            onClose();
        }
      }}
    >
      <header className="passport-header">
        <div>
          <h2 id="passport-title">我的飛行護照</h2>
          <span>{dataLabel || "你的航線與飛行紀錄"}</span>
        </div>
        <button
          autoFocus
          className="icon-button"
          aria-label="關閉飛行護照"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </header>
      <div className="passport-layout">
        <section className="passport-artwork" aria-label="個人航線護照卡">
          <div className="passport-card-shell">
            <svg
              ref={card}
              className="passport-card"
              viewBox="0 0 480 660"
              width="480"
              height="660"
              xmlns="http://www.w3.org/2000/svg"
              role="img"
              aria-label={`${year === "all" ? "所有年份" : year + " 年"}，${summary.count} 段飛行，${fmt(summary.distance)} 公里，${summary.countries.length} 個國家與地區`}
              fontFamily="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
            >
              <defs>
                <linearGradient id={`${id}-paper`} x1="0" y1="0" x2="1" y2="1">
                  <stop stopColor="#c5e7ee" />
                  <stop offset=".45" stopColor="#c8cff0" />
                  <stop offset=".73" stopColor="#e0d8f0" />
                  <stop offset="1" stopColor="#bbdfeb" />
                </linearGradient>
                <linearGradient id={`${id}-land`} x1="0" x2="1">
                  <stop stopColor="#e9e0fa" />
                  <stop offset=".5" stopColor="#e9f4ed" />
                  <stop offset="1" stopColor="#f5d9ee" />
                </linearGradient>
                <linearGradient id={`${id}-foil`} x1="0" x2="1" y1="0" y2="1">
                  <stop stopColor="#c0f3ed" />
                  <stop offset=".4" stopColor="#c7b2f0" />
                  <stop offset=".6" stopColor="#f9d4e9" />
                  <stop offset="1" stopColor="#b7e2e8" />
                </linearGradient>
                <linearGradient id={`${id}-sheen`} x1="0" y1="1" x2="1" y2="0">
                  <stop stopColor="#ffffff" stopOpacity="0" />
                  <stop offset=".4" stopColor="#ffffff" stopOpacity="0" />
                  <stop offset=".58" stopColor="#ffffff" stopOpacity=".22" />
                  <stop offset=".75" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>
                <pattern
                  id={`${id}-lines`}
                  width="6"
                  height="6"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M0 3H6"
                    stroke="#ffffff"
                    strokeOpacity=".18"
                    strokeWidth=".6"
                  />
                </pattern>
                <clipPath id={`${id}-clip`}>
                  <rect width="480" height="660" rx="20" />
                </clipPath>
              </defs>
              <g clipPath={`url(#${id}-clip)`}>
                <rect width="480" height="660" fill={`url(#${id}-paper)`} />
                <rect width="480" height="660" fill={`url(#${id}-lines)`} />
                <rect width="480" height="660" fill={`url(#${id}-sheen)`} />
                <rect
                  x="7"
                  y="7"
                  width="466"
                  height="646"
                  rx="15"
                  fill="none"
                  stroke="#ffffff"
                  strokeOpacity=".35"
                />
                <text
                  x="28"
                  y="32"
                  fill="#43537b"
                  fontSize="17"
                  letterSpacing="2"
                >
                  FLIGHT LOG
                </text>
                <text
                  x="452"
                  y="32"
                  textAnchor="end"
                  fill="#43537b"
                  fontSize="17"
                  letterSpacing="2"
                >
                  {period}
                </text>
                <g transform="translate(0 45)">
                  <path
                    d={art.land}
                    fill={`url(#${id}-land)`}
                    stroke="#96bad3"
                    strokeWidth=".35"
                  />
                  {art.routes.map((r) => (
                    <path
                      key={r.key}
                      d={r.path}
                      fill="none"
                      stroke="#6750a1"
                      strokeWidth="1.1"
                      opacity=".77"
                    />
                  ))}
                  {art.airports.map((a) => (
                    <circle
                      key={a.code}
                      cx={a.point[0]}
                      cy={a.point[1]}
                      r="2.6"
                      fill="#66409d"
                      stroke="#eeeaff"
                      strokeWidth="1"
                    />
                  ))}
                </g>
                <path d="M24 341H456" stroke="#6887ad" strokeOpacity=".3" />
                <text x="28" y="369" fontSize="20" letterSpacing="3">
                  {summary.countries
                    .slice(0, 14)
                    .map((c) => flag(c.code))
                    .join(" ")}
                </text>
                <text
                  x="28"
                  y="406"
                  fill="#372665"
                  fontSize="18"
                  fontWeight="650"
                  letterSpacing="1"
                >
                  MY FLIGHT PASSPORT
                </text>
                <text x="28" y="430" fill="#4d4d77" fontSize="17">
                  {dataLabel ||
                    (year === "all" ? "累計飛行紀錄" : `${year} 年飛行紀錄`)}
                </text>
                <text
                  x="26"
                  y="502"
                  fill="#372665"
                  fontSize="68"
                  fontWeight="650"
                  letterSpacing="-3"
                >
                  {summary.count}
                </text>
                <text x="30" y="528" fill="#4d4d77" fontSize="18">
                  flights
                </text>
                <text x="205" y="465" fill="#4d4d77" fontSize="17">
                  紀錄期間
                </text>
                <text
                  x="205"
                  y="489"
                  fill="#372665"
                  fontSize="17"
                  fontWeight="550"
                >
                  {summary.first
                    ? summary.first.date.replaceAll("-", ".")
                    : "尚未有已搭乘紀錄"}
                </text>
                {summary.last && (
                  <text
                    x="205"
                    y="514"
                    fill="#372665"
                    fontSize="17"
                    fontWeight="550"
                  >
                    至 {summary.last.date.replaceAll("-", ".")}
                  </text>
                )}
                <g fill="#4d4d77" fontSize="17">
                  <text x="28" y="568">
                    累計距離
                  </text>
                  <text x="235" y="568">
                    機場
                  </text>
                  <text x="340" y="568">
                    國家／地區
                  </text>
                </g>
                <g fill="#372665" fontSize="26" fontWeight="650">
                  <text x="28" y="600">
                    {fmt(summary.distance)}
                    <tspan fontSize="14" fontWeight="400">
                      {" "}
                      km
                    </tspan>
                  </text>
                  <text x="235" y="600">
                    {art.airports.length}
                  </text>
                  <text x="340" y="600">
                    {summary.countries.length}
                  </text>
                </g>
                <path d="M24 620H456" stroke="#6887ad" strokeOpacity=".3" />
                <text
                  x="28"
                  y="641"
                  fill="#526584"
                  fontSize="14"
                  letterSpacing=".5"
                >
                  Natural Earth · 機場間大圓距離估算
                </text>
                <rect
                  x="413"
                  y="396"
                  width="38"
                  height="27"
                  rx="7"
                  fill={`url(#${id}-foil)`}
                  stroke="#ffffff"
                  strokeOpacity=".6"
                />
                <path
                  d="M427 402v15m-6-10 12 7m0-7-12 7"
                  stroke="#ffffff"
                  strokeWidth="1.3"
                  opacity=".8"
                />
              </g>
            </svg>
          </div>
          <p className="passport-image-note">依此瀏覽器的已搭乘紀錄製作</p>
        </section>
        <section className="passport-details">
          <div className="passport-controls">
            <label className="passport-year">
              <span>紀錄年份</span>
              <div>
                <select
                  aria-label="護照年份"
                  value={year}
                  onChange={(e) => {
                    setYear(e.target.value);
                    setNotice("");
                  }}
                >
                  <option value="all">所有年份</option>
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y} 年
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} />
              </div>
            </label>
            <button
              className="passport-save"
              disabled={saving}
              onClick={async () => {
                if (!card.current) return;
                setSaving(true);
                setNotice("");
                try {
                  await savePassportImage(card.current, year);
                  setNotice("護照圖片已準備好下載");
                } catch {
                  setNotice("圖片未能匯出，請重試");
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? (
                <LoaderCircle className="spin" size={17} />
              ) : (
                <Download size={17} />
              )}{" "}
              {saving ? "正在製作圖片" : "儲存護照圖片"}
            </button>
            <p className="passport-notice" role="status">
              {notice}
            </p>
          </div>
          <div className="passport-memories">
            <h3>值得記住的航班</h3>
            {milestones.map((m) => (
              <button
                key={m.title}
                className="passport-memory"
                onClick={() => onSelect(m.flight)}
                aria-label={`回放${m.title} ${m.flight.from} 至 ${m.flight.to}`}
              >
                <span>{m.title}</span>
                <strong>
                  {m.flight.from}
                  <Plane size={18} />
                  {m.flight.to}
                  <ArrowUpRight size={16} />
                </strong>
                <small>
                  {m.meta}
                  <span>{m.flight.flight || "班號待補"}</span>
                </small>
              </button>
            ))}
            {!milestones.length && <p>確認一段已搭乘航班，開始收藏你的旅行</p>}
          </div>
          <div className="passport-places">
            <h3>
              抵達過的地方 <span>{summary.countries.length}</span>
            </h3>
            <div>
              {summary.countries.map((c) => {
                const first = collection
                  .filter((f) => airports[f.to]?.country === c.code)
                  .sort((a, b) => a.date.localeCompare(b.date))[0];
                return (
                  <button
                    key={c.code}
                    onClick={() => onSelect(first)}
                    aria-label={`回放紀錄中首次抵達${countryName(c.code)}`}
                  >
                    <span aria-hidden="true">{flag(c.code)}</span>
                    <span>{countryName(c.code)}</span>
                    <small>{c.visits}</small>
                  </button>
                );
              })}
            </div>
          </div>
          <p className="passport-disclaimer">
            抵達次數可能包含轉機，首次出發以現有紀錄為準
          </p>
        </section>
      </div>
    </dialog>
  );
}
