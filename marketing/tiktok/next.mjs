/**
 * What the next post should be: every post so far with its format, hook and
 * games, so a new one can avoid repeating them, then the first free day and
 * a suggested kind (video or photo, kept near half and half) and format.
 *
 *   npm run tiktok:next
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FORMATS, formatOf } from "./formats/index.mjs";
import {
  WINDOW,
  firstFreeDay,
  parseChecklist,
  pickFormat,
  pickKind,
} from "./history.mjs";

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

const used = [];
for (const { name, done, dates } of posts) {
  const post = JSON.parse(
    await readFile(path.join(here, "posts", `${name}.json`), "utf8"),
  );
  const format = formatOf(post);
  used.push(format);
  const hook = post.hook.title ?? post.hook.take;
  console.log(
    `${done ? "posted " : "planned"} ${dates[0] ?? "          "}  ${format.padEnd(11)}  ${hook.replaceAll("*", "")}`,
  );
  console.log(
    `                                 ${[...new Set(slugsIn(post))].join(", ")}`,
  );
}

const kinds = used.map((format) => !!FORMATS[format].video);
const recent = kinds.slice(-WINDOW);
const video = pickKind(kinds);
const format = pickFormat(FORMATS, video, used);
const today = new Date().toISOString().slice(0, 10);
console.log(`\nnext free day: ${firstFreeDay(posts, today)}`);
console.log(
  `last ${recent.length}: ${recent.filter(Boolean).length} video, ${recent.filter((v) => !v).length} photo`,
);
console.log(
  `suggested: ${video ? "video" : "photo"}, ${format} — ${FORMATS[format].summary}`,
);
