import assert from "node:assert/strict";
import { test } from "node:test";
import { videoCaption } from "./posting.mjs";

test("a title ending mid-sentence gets a full stop before the description", () => {
  assert.equal(
    videoCaption({
      title: "Round 6 gets everyone",
      description: "Eight pairs.",
    }),
    "Round 6 gets everyone. Eight pairs.",
  );
});

test("a title already ending in punctuation or an emoji is left alone", () => {
  for (const title of [
    "Which came first?",
    "Round 8 is brutal 🎮",
    "Ten games 😮‍💨",
    "Best RPGs ⚔️",
  ]) {
    assert.equal(videoCaption({ title, description: "Go." }), `${title} Go.`);
  }
});
