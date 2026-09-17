import { spawn } from "node:child_process";
if (Number(process.versions.node.split(".")[0]) < 22) {
  console.error("Please use Node 24 (see .nvmrc).");
  process.exit(1);
}
const specs = [
  [
    "node_modules/wrangler/bin/wrangler.js",
    ["dev", "--ip", "127.0.0.1", "--port", "8787"],
  ],
  ["node_modules/vite/bin/vite.js", ["--host", "127.0.0.1"]],
];
const children = specs.map(([file, args]) =>
  spawn(process.execPath, [file, ...args], {
    stdio: "inherit",
    env: process.env,
  }),
);
let exiting = false;
function stop(code = 0) {
  if (exiting) return;
  exiting = true;
  for (const child of children) child.kill("SIGTERM");
  setTimeout(() => process.exit(code), 300);
}
for (const child of children) {
  child.on("error", () => stop(1));
  child.on("exit", (code) => stop(code || 0));
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
