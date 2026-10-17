import assert from "node:assert/strict";
import { test } from "node:test";
import { firstFreeDay, parseChecklist, pickFormat } from "./history.mjs";

const checklist = `# TikTok posts

An example line, indented, isn't a post:

    - [x] [example](posts/example.json) — 2026-01-01 — https://…

- [x] [best-horror-games](posts/best-horror-games.json) — 2026-10-14 — https://www.tiktok.com/@playratesapp/photo/1
- [ ] [best-coop-games](posts/best-coop-games.json) — scheduled 2026-10-16 21:00 EEST
- [ ] [hot-take-2017](posts/hot-take-2017.json) — hottake, 2026-10-17
- [ ] [untimed](posts/untimed.json)
`;

test("reads posts in order, with their dates, and skips the example", () => {
  assert.deepEqual(parseChecklist(checklist), [
    { name: "best-horror-games", done: true, dates: ["2026-10-14"] },
    { name: "best-coop-games", done: false, dates: ["2026-10-16"] },
    { name: "hot-take-2017", done: false, dates: ["2026-10-17"] },
    { name: "untimed", done: false, dates: [] },
  ]);
});

test("the first free day skips every taken day, across a month end", () => {
  const posts = [{ dates: ["2026-10-30"] }, { dates: ["2026-10-31"] }];
  assert.equal(firstFreeDay(posts, "2026-10-29"), "2026-10-29");
  assert.equal(firstFreeDay(posts, "2026-10-30"), "2026-11-01");
});

const formats = {
  ranked: {},
  pairs: {},
  guess: { video: true },
  higherlower: { video: true },
};

test("a photo post is followed by a video, at random", () => {
  assert.equal(
    pickFormat(formats, "ranked", () => 0),
    "guess",
  );
  assert.equal(
    pickFormat(formats, "pairs", () => 0.99),
    "higherlower",
  );
});

test("a video is followed by a photo post, at random", () => {
  assert.equal(
    pickFormat(formats, "guess", () => 0),
    "ranked",
  );
  assert.equal(
    pickFormat(formats, "higherlower", () => 0.99),
    "pairs",
  );
});

test("with no posts yet, the first is a video", () => {
  assert.equal(
    pickFormat(formats, undefined, () => 0),
    "guess",
  );
});
