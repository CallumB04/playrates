import assert from "node:assert/strict";
import { test } from "node:test";
import { missingCopy } from "./handmade.mjs";

const post = {
  hook: { text: "6 tips for beginners in" },
  items: [
    { title: "Get your horse", line: "Melina gives you Torrent." },
    { title: "Level Vigor first", line: "Bosses stop one-shotting you." },
  ],
};

test("copy on the slides matches the post file across tags and line breaks", () => {
  const html = `<div class="lead">6 tips for beginners
    in</div><h2>Get your horse</h2><p>Melina gives <b>you</b> Torrent.</p>
    <h2>Level Vigor first</h2><p>Bosses stop one-shotting you.</p>`;
  assert.deepEqual(missingCopy(post, html), []);
});

test("an apostrophe written as an entity still matches", () => {
  const html = `<div>6 tips for beginners in</div><h2>Get your horse</h2>
    <p>Melina gives you Torrent.</p><h2>Level Vigor first</h2>
    <p>Bosses stop one&#39;shotting you.</p>`;
  assert.deepEqual(
    missingCopy(
      {
        ...post,
        items: [
          post.items[0],
          { title: "Level Vigor first", line: "Bosses stop one'shotting you." },
        ],
      },
      html,
    ),
    [],
  );
});

test("copy edited on the slides but not in the post file is reported", () => {
  const html = `<div>6 tips for beginners in</div><h2>Get your horse</h2>
    <p>Melina gives you Torrent.</p><h2>Level Vigour first</h2>
    <p>Bosses stop one-shotting you.</p>`;
  assert.deepEqual(missingCopy(post, html), ["Level Vigor first"]);
});
