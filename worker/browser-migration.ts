type MigrationConfig = {
  BROWSER_MIGRATION_SOURCE_ORIGIN?: string;
  BROWSER_MIGRATION_TARGET_ORIGIN?: string;
};

// This endpoint transfers only this browser's old copy to an explicitly configured
// replacement origin. No flight data is received or stored by the Worker.
export function browserMigrationResponse(
  request: Request,
  config: MigrationConfig,
) {
  const source = config.BROWSER_MIGRATION_SOURCE_ORIGIN;
  const target = config.BROWSER_MIGRATION_TARGET_ORIGIN;
  if (!source || !target || request.method !== "GET")
    return new Response("Not found", { status: 404 });
  try {
    if (
      new URL(request.url).origin !== source ||
      new URL(source).origin !== source ||
      new URL(target).origin !== target ||
      !source.startsWith("https://") ||
      !target.startsWith("https://") ||
      source === target
    )
      return new Response("Not found", { status: 404 });
  } catch {
    return new Response("Not found", { status: 404 });
  }
  const nonce = crypto.randomUUID();
  const destination = JSON.stringify(target).replaceAll("<", "\\u003c");
  return new Response(
    `<!doctype html><meta charset="utf-8"><title>Flight Log record transfer</title><script nonce="${nonce}">
const destination = ${destination};
addEventListener("message", (event) => {
  if (parent === window || event.source !== parent || event.origin !== destination ||
      event.data?.type !== "flight-log-migrate-request" ||
      typeof event.data.nonce !== "string" || event.data.nonce.length > 100) return;
  let raw = null, error = false;
  try { raw = localStorage.getItem("flight-log.browser.v1"); } catch { error = true; }
  parent.postMessage({ type: "flight-log-migrate-response", nonce: event.data.nonce, raw, error }, destination);
});
</script>`,
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex",
        "Content-Security-Policy": `default-src 'none'; script-src 'nonce-${nonce}'; frame-ancestors ${target}; base-uri 'none'; form-action 'none'`,
      },
    },
  );
}
