import {parse} from "jsonc-parser";
import {readFileSync} from "node:fs";
const c=parse(readFileSync("wrangler.jsonc","utf8"));
if(!c.d1_databases?.[0]?.database_id || c.d1_databases[0].database_id.startsWith("00000000")) throw new Error("Create your own D1 database and update wrangler.jsonc first. See docs/SELF-HOST.md.");
console.log("Deploying to your configured Cloudflare account. Remote seed data, if added, will be public.");
