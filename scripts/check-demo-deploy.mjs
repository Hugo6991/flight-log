import { readFileSync } from "node:fs";
import { parse } from "jsonc-parser";
import { loadEnv } from "vite";
const config = parse(readFileSync("wrangler.demo.jsonc", "utf8"));
const { VITE_STORAGE_SCOPE_ORIGIN: scope } = loadEnv("demo", process.cwd());
const source = config.vars?.BROWSER_MIGRATION_SOURCE_ORIGIN;
const target = config.vars?.BROWSER_MIGRATION_TARGET_ORIGIN;
if (!scope || scope !== source || !target || source === target)
  throw new Error(
    "Configure matching demo storage isolation and migration origins before deploying",
  );
if (
  !config.routes?.some(
    (route) => route.custom_domain && `https://${route.pattern}` === scope,
  )
)
  throw new Error(
    "The isolated storage origin must match a configured demo domain",
  );
const demoDb = config.d1_databases?.[0]?.database_id;
if (!demoDb || demoDb.startsWith("00000000"))
  throw new Error(
    "Configure the independent demo D1 database before deploying",
  );
// The demo must never read a personal database. List personal D1 ids in
// .env.demo as DEMO_FORBIDDEN_D1_IDS (comma separated); that file stays out of git.
const { DEMO_FORBIDDEN_D1_IDS: forbidden = "" } = loadEnv("demo", process.cwd(), "");
const forbiddenIds = forbidden.split(",").map((s) => s.trim()).filter(Boolean);
if (forbiddenIds.includes(demoDb))
  throw new Error(
    "The demo D1 database id matches a personal database listed in DEMO_FORBIDDEN_D1_IDS. Refusing to deploy real data to the demo",
  );
if (!forbiddenIds.length)
  console.warn(
    "Warning: DEMO_FORBIDDEN_D1_IDS is empty in .env.demo, so the demo id is not checked against personal databases. Add your personal D1 id there",
  );
console.log("Demo domain and browser storage isolation verified");
