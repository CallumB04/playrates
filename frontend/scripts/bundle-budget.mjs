// Fails when the JavaScript a first visit downloads grows past its budget.
// Run after `vite build`. Counts what index.html loads up front, gzipped:
// the entry and every chunk it preloads.
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

/** Gzipped bytes. Lowering it is the point; raise it only on purpose. */
const BUDGET = 225_000;

const dist = new URL("../dist/", import.meta.url).pathname;
const html = readFileSync(join(dist, "index.html"), "utf8");
const files = [...html.matchAll(/(?:src|href)="\/(assets\/[^"]+\.js)"/g)].map(
    (m) => m[1]
);
const sizes = files.map((file) => ({
    file,
    gzip: gzipSync(readFileSync(join(dist, file))).length,
}));
const total = sizes.reduce((sum, s) => sum + s.gzip, 0);
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

for (const { file, gzip } of sizes.sort((a, b) => b.gzip - a.gzip).slice(0, 5))
    console.log(`  ${kb(gzip).padStart(9)}  ${file}`);
console.log(
    `First-load JavaScript: ${kb(total)} gzipped in ${files.length} files (budget ${kb(BUDGET)})`
);
if (total > BUDGET) {
    console.error("Over budget. Lazy-load what the first page doesn't need.");
    process.exit(1);
}
