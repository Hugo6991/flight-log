import { expect, it } from "vitest";
import worker from "./index";
const state = {
  schema_version: 1,
  data_revision: 1,
  flights: [
    {
      id: "example",
      date: "2024-01-01",
      flight: "",
      from: "TPE",
      to: "NRT",
      departure: "",
      arrival: "",
      status: "flown",
      note: "",
      sources: [
        {
          type: "trip_export",
          label: "private row",
          url: "https://mail.google.com/private",
        },
      ],
    },
  ],
};
const env = {
  DB: {
    prepare: () => ({
      first: async () => ({ payload: JSON.stringify(state) }),
    }),
  },
  ASSETS: { fetch: async () => new Response("<html></html>") },
} as unknown as Env;
it("serves updated public history without private source links or row labels", async () => {
  const response = await worker.fetch(
    new Request("https://example.test/api/state"),
    env,
  );
  const body = (await response.json()) as typeof state;
  expect(body.data_revision).toBe(1);
  expect(body.flights[0].sources).toEqual([
    { type: "trip_export", label: "Trip.com 訂單匯出" },
  ]);
  expect(response.headers.get("cache-control")).toBe("no-store");
});
it("keeps the public API read-only", async () => {
  for (const method of ["POST", "PUT", "DELETE"]) {
    const response = await worker.fetch(
      new Request("https://example.test/api/state", { method }),
      {} as Env,
    );
    expect(response.status).toBe(405);
  }
});
it("allows the selected map provider and local bundled worker through CSP", async () => {
  const response = await worker.fetch(
    new Request("https://example.test/"),
    env,
  );
  const csp = response.headers.get("content-security-policy");
  expect(csp).toContain(
    "connect-src 'self' https://tiles.openfreemap.org https://gibs.earthdata.nasa.gov;",
  );
  expect(csp).toContain("worker-src 'self' blob:");
  expect(csp).toContain("frame-ancestors 'none'");
});
