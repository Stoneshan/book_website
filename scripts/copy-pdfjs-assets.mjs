import { cp, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const source = path.join(root, "node_modules", "pdfjs-dist");
const target = path.join(root, "public", "pdfjs");

const entries = [
  ["build/pdf.worker.min.mjs", "pdf.worker.min.mjs"],
  ["cmaps", "cmaps"],
  ["standard_fonts", "standard_fonts"],
  ["wasm", "wasm"],
  ["iccs", "iccs"],
];

if (!existsSync(source)) {
  console.log("[pdfjs] pdfjs-dist is not installed, skipping asset copy.");
  process.exit(0);
}

await mkdir(target, { recursive: true });

for (const [from, to] of entries) {
  const src = path.join(source, from);
  const dest = path.join(target, to);
  if (!existsSync(src)) {
    console.warn(`[pdfjs] missing ${from}, skipped.`);
    continue;
  }
  await cp(src, dest, { recursive: true });
  console.log(`[pdfjs] copied ${from} -> public/pdfjs/${to}`);
}
