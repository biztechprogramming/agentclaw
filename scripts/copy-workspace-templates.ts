import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(rootDir, "docs", "reference", "templates");
const dest = path.join(rootDir, "dist", "docs", "reference", "templates");

fs.mkdirSync(dest, { recursive: true });
for (const file of fs.readdirSync(src)) {
  fs.copyFileSync(path.join(src, file), path.join(dest, file));
  console.log(`[copy-workspace-templates] Copied ${file}`);
}
console.log("[copy-workspace-templates] Done");
