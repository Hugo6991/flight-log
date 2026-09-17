/// <reference types="node" />
import { expect, it } from "vitest";
import { browserMigrationResponse } from "./browser-migration";
const source = "https://old.example.com";
const target = "https://personal.example.com";
const config = {
  BROWSER_MIGRATION_SOURCE_ORIGIN: source,
  BROWSER_MIGRATION_TARGET_ORIGIN: target,
};
it("only enables browser migration on the configured source origin", () => {
  for (const [url, env, method] of [
    [source, {}, "GET"],
    ["https://demo.example.com", config, "GET"],
    [source, config, "POST"],
    [
      source,
      {
        ...config,
        BROWSER_MIGRATION_TARGET_ORIGIN: "https://personal.example.com/path",
      },
      "GET",
    ],
    [
      source,
      {
        ...config,
        BROWSER_MIGRATION_TARGET_ORIGIN: "http://personal.example.com",
      },
      "GET",
    ],
  ] as const) {
    expect(
      browserMigrationResponse(
        new Request(url + "/browser-migration/", { method }),
        env,
      ).status,
    ).toBe(404);
  }
});
it("restricts embedding and messages to the replacement origin without exposing data in HTML", async () => {
  const response = browserMigrationResponse(
    new Request(source + "/browser-migration/"),
    config,
  );
  const csp = response.headers.get("Content-Security-Policy")!;
  expect(response.status).toBe(200);
  expect(csp).toContain(`frame-ancestors ${target};`);
  expect(csp).not.toContain("*");
  expect(csp).not.toContain("unsafe-inline");
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  const html = await response.text();
  expect(html).toContain("event.source !== parent");
  expect(html).toContain("event.origin !== destination");
  expect(html).toContain('localStorage.getItem("flight-log.browser.v1")');
  expect(html).not.toContain("removeItem");
  expect(html).not.toContain("fetch(");
});

it("does not disclose browser records to a different parent origin", async () => {
  const { runInNewContext } = await import("node:vm");
  const { vi } = await import("vitest");
  const response = browserMigrationResponse(
    new Request(source + "/browser-migration/"),
    config,
  );
  const html = await response.text();
  const script = html.match(/<script nonce="[^"]+">([\s\S]*)<\/script>/)![1];
  const parent = { postMessage: vi.fn() };
  const getItem = vi.fn(() => '{"schema_version":1,"flights":[]}');
  let receive: (event: unknown) => void;
  runInNewContext(script, {
    parent,
    window: {},
    localStorage: { getItem },
    addEventListener: (_type: string, handler: typeof receive) => {
      receive = handler;
    },
  });
  const data = { type: "flight-log-migrate-request", nonce: "request-nonce" };
  receive!({ origin: "https://attacker.example.com", source: parent, data });
  receive!({ origin: target, source: {}, data });
  expect(getItem).not.toHaveBeenCalled();
  expect(parent.postMessage).not.toHaveBeenCalled();
  receive!({ origin: target, source: parent, data });
  expect(parent.postMessage).toHaveBeenCalledWith(
    {
      type: "flight-log-migrate-response",
      nonce: data.nonce,
      raw: '{"schema_version":1,"flights":[]}',
      error: false,
    },
    target,
  );
});
