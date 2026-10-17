/**
 * What the next post should be: every post so far with its format, hook and
 * games, so a new one can avoid repeating them, then the first free day and
 * a format picked at random.
 *
 *   npm run tiktok:next
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FORMATS, formatOf } from "./formats/index.mjs";
import { firstFreeDay, parseChecklist, pickFormat } from "./history.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const posts = parseChecklist(
  await readFile(path.join(here, "POSTS.md"), "utf8"),
);

/** Every game a post names, however its format nests them. */
const slugsIn = (node) =>
  Array.isArray(node)
    ? node.flatMap(slugsIn)
    : node && typeof node === "object"
      ? [
          ...(typeof node.slug === "string" ? [node.slug] : []),
          ...Object.entries(node)
            .filter(([key]) => key !== "cta")
            .flatMap(([, value]) => slugsIn(value)),
        ]
      : [];

let last;
for (const { name, done, dates } of posts) {
  const post = JSON.parse(
    await readFile(path.join(here, "posts", `${name}.json`), "utf8"),
  );
  last = formatOf(post);
  const hook = post.hook.title ?? post.hook.take;
  console.log(
    `${done ? "posted " : "planned"} ${dates[0] ?? "          "}  ${last.padEnd(8)}  ${hook.replaceAll("*", "")}`,
  );
  console.log(
    `                              ${[...new Set(slugsIn(post))].join(", ")}`,
  );
}

const today = new Date().toISOString().slice(0, 10);
const format = pickFormat(Object.keys(FORMATS), last);
console.log(`\nnext free day: ${firstFreeDay(posts, today)}`);
console.log(`format: ${format} — ${FORMATS[format].summary}`);
