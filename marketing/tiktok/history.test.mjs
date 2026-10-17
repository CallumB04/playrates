import assert from "node:assert/strict";
import { test } from "node:test";
import {
  firstFreeDay,
  parseChecklist,
  pickFormat,
  pickKind,
} from "./history.mjs";

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

test("never three of one kind in a row", () => {
  assert.equal(pickKind([true, false, false]), true);
  assert.equal(pickKind([false, true, true]), false);
});

test("otherwise the kind the recent posts have fewer of", () => {
  assert.equal(pickKind([false, false, true, false, true, false]), true);
  // Only the last ten count: the early run of photos is forgotten.
  const early = Array(8).fill(false);
  const recent = [
    true,
    false,
    true,
    true,
    false,
    true,
    false,
    true,
    false,
    true,
  ];
  assert.equal(pickKind([...early, ...recent]), false);
});

test("a tie is a coin toss", () => {
  assert.equal(
    pickKind([true, false], () => 0.2),
    true,
  );
  assert.equal(
    pickKind([true, false], () => 0.8),
    false,
  );
  assert.equal(
    pickKind([], () => 0.2),
    true,
  );
});

test("a format of the kind, not the one that kind used last", () => {
  const history = ["ranked", "guess", "pairs"];
  assert.equal(
    pickFormat(formats, true, history, () => 0),
    "higherlower",
  );
  assert.equal(
    pickFormat(formats, false, history, () => 0.99),
    "ranked",
  );
});
