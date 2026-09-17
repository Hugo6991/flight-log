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
if (
  !config.d1_databases?.[0]?.database_id ||
  config.d1_databases[0].database_id.startsWith("00000000")
)
  throw new Error(
    "Configure the independent demo D1 database before deploying",
  );
console.log("Demo domain and browser storage isolation verified");
