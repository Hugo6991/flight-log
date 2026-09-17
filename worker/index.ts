import { applyHistoryUpdate } from "../shared/history-update";
import { stateSchema } from "../shared/model";
const json = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex",
    },
  });
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (path === "/api/state") {
      if (request.method !== "GET")
        return json(
          { error: "編輯內容儲存在各自的瀏覽器，公開來源不接受修改。" },
          405,
        );
      const row = await env.DB.prepare(
        "SELECT payload FROM flight_state WHERE id=1",
      ).first<{ payload: string }>();
      if (!row) return json({ error: "航班資料尚未初始化" }, 503);
      const state = await applyHistoryUpdate(
        stateSchema.parse(JSON.parse(row.payload)),
      );
      const flights = state.flights.map((f) => ({
        ...f,
        sources: f.sources.map((s) => ({
          type: s.type,
          label: s.type === "trip_export" ? "Trip.com 訂單匯出" : s.label,
        })),
      }));
      return json({ ...state, flights });
    }
    if (path.startsWith("/api/")) return json({ error: "找不到此功能" }, 404);
    const response = await env.ASSETS.fetch(request);
    const secured = new Response(response.body, response);
    secured.headers.set("X-Content-Type-Options", "nosniff");
    secured.headers.set("Referrer-Policy", "same-origin");
    secured.headers.set("X-Frame-Options", "DENY");
    secured.headers.set("X-Robots-Tag", "noindex");
    secured.headers.set(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://tiles.openfreemap.org https://gibs.earthdata.nasa.gov; worker-src 'self' blob:; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    );
    return secured;
  },
} satisfies ExportedHandler<Env>;
