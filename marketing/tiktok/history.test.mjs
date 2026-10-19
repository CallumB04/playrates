import assert from "node:assert/strict";
import { test } from "node:test";
import {
  firstFreeDay,
  parseChecklist,
  pickFormat,
  videoSlot,
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

test("the video swaps slots with the photo from one day to the next", () => {
  const day = (date, videoTime, photoTime) => [
    { dates: [date], time: videoTime, video: true },
    { dates: [date], time: photoTime, video: false },
  ];
  assert.equal(videoSlot(day("2026-10-19", "16:00", "21:00")), "21:00");
  assert.equal(videoSlot(day("2026-10-19", "21:00", "16:00")), "16:00");
  // The latest full day decides, whatever order the checklist lists them in.
  assert.equal(
    videoSlot([
      ...day("2026-10-20", "21:00", "16:00"),
      ...day("2026-10-19", "16:00", "21:00"),
    ]),
    "16:00",
  );
});

test("a day with one post doesn't count, and a post without a time is 21:00", () => {
  assert.equal(
    videoSlot([
      { dates: ["2026-10-18"], time: "16:00", video: true },
      { dates: ["2026-10-18"], video: false },
      { dates: ["2026-10-19"], time: "21:00", video: true },
    ]),
    "21:00",
  );
  assert.equal(videoSlot([]), "16:00");
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
