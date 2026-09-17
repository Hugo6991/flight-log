import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve, join, relative } from "node:path";
import { prepareImport } from "../shared/import-review.ts";
const [file, output = "data/local/prepared-import"] = process.argv.slice(2);
if (!file)
  throw new Error(
    "Usage: npm run import:prepare -- data/local/flights.reviewed.json [data/local/output-directory]",
  );
const local = resolve("data/local"),
  out = resolve(output);
if (!relative(local, out) || relative(local, out).startsWith(".."))
  throw new Error("Choose a new subdirectory inside data/local.");
if (existsSync(out))
  throw new Error(
    "Output already exists. Choose a fresh folder to preserve the previous import.",
  );
const result = prepareImport(
  JSON.parse(readFileSync(file, "utf8")),
  JSON.parse(readFileSync("public/airports.json", "utf8")),
);
mkdirSync(out, { recursive: true });
for (const [name, data] of [
  ["flights.json", JSON.stringify(result.state, null, 2)],
  ["seed.sql", result.sql],
  ["report.json", JSON.stringify(result.report, null, 2)],
])
  writeFileSync(join(out, name), data + "\n");
console.log(JSON.stringify(result.report, null, 2));
console.log(
  `Prepared ${output}. Review flights.json before importing or publishing. No database or website was modified.`,
);
