// TikTok Studio upload-page helpers. A navigation wipes them, so run this
// whole file through javascript_tool again after every page load.

window._fire = (el) => {
  for (const t of ["pointerdown", "mousedown", "pointerup", "mouseup", "click"])
    el.dispatchEvent(new MouseEvent(t, { bubbles: true }));
};
var wait = (ms) => new Promise((s) => setTimeout(s, ms));

// Picks the suggestion whose first line is exactly the tag, so it becomes a
// real tag rather than plain text.
window.pickTag = (tag) => {
  const items = [...document.querySelectorAll(".hashtag-suggestion-item")];
  const it = items.find((e) => e.innerText.split("\n")[0].trim() === tag);
  if (!it)
    return "no match: " + items.map((e) => e.innerText.split("\n")[0]).slice(0, 5).join(",");
  for (const t of ["mousedown", "mouseup", "click"])
    it.dispatchEvent(new MouseEvent(t, { bubbles: true }));
  return "picked";
};

// The sound picker exists twice in the DOM; only the visible one answers.
window._vis = () => {
  const inp = [...document.querySelectorAll('input[placeholder="Search sounds"]')].find(
    (i) => i.offsetParent,
  );
  let m = inp;
  while (m && !(m.querySelectorAll && [...m.querySelectorAll("button")].some((b) => b.innerText.trim() === "Use")))
    m = m.parentElement;
  return m;
};
// Rows hold non-breaking spaces, so names are matched after collapsing them.
window._rows = () =>
  [..._vis().querySelectorAll("button")]
    .filter((b) => b.innerText.trim() === "Use")
    .map((b) => {
      let p = b;
      for (let i = 0; i < 4; i++) p = p.parentElement;
      return [b, p.innerText.replace(/\s+/g, " ").replace(/ Use$/, "")];
    });
// "Sound Add sound" until one applies; read this, not a screenshot, which lags.
window._sound = () =>
  [...document.querySelectorAll("div")]
    .find((d) => d.innerText && d.innerText.startsWith("Sound\n"))
    ?.innerText.replace(/\s+/g, " ")
    .slice(0, 90);
window._pick = async (name) => {
  const r = _rows().find((r) => r[1] === name || r[1].startsWith(name));
  if (!r) return "none";
  r[0].click();
  await wait(5000);
  return _sound();
};

// _sched(6, 20, 20, true): day of the month, hour, minute, and whether the day
// is in next month's page of the picker.
window._sched = async (day, h, m, next) => {
  document.querySelector("input[value=schedule]").click();
  await wait(1500);
  const vals = () =>
    [...document.querySelectorAll("input")].filter((i) => i.offsetParent && /^\d{1,4}[-:]/.test(i.value));
  const di = vals().find((i) => i.value.includes("-"));
  _fire(di.closest(".TUXInputBox") || di);
  await wait(1000);
  if (next) {
    const a = [...document.querySelectorAll("span.arrow")];
    _fire(a[a.length - 1]);
    await wait(800);
  }
  const d = [...document.querySelectorAll("span.day.valid")].find((d) => d.innerText.trim() === String(day));
  if (!d) return "no day";
  _fire(d);
  await wait(1000);
  const ti = vals().find((i) => /^\d\d:\d\d$/.test(i.value));
  ti.scrollIntoView({ block: "center" });
  _fire(ti.closest(".TUXInputBox") || ti);
  await wait(1000);
  // The columns ignore clicks and select whatever is centred; deltaY 20 is one row.
  const cols = [...document.querySelectorAll(".tiktok-timepicker-time-scroll-container")];
  const step = async (col, n) => {
    for (let k = 0; k < Math.abs(n); k++) {
      col.dispatchEvent(new WheelEvent("wheel", { deltaY: n > 0 ? 20 : -20, bubbles: true }));
      await wait(350);
    }
  };
  let [ch, cm] = ti.value.split(":").map(Number);
  await step(cols[0], h - ch);
  await wait(800);
  [ch, cm] = ti.value.split(":").map(Number);
  await step(cols[1], (m - cm) / 5);
  await wait(800);
  return vals().map((i) => i.value);
};

// Everything to read before pressing Schedule. btn must be ["Schedule"]: a
// stray click near the hour list flips the post to Now and the button to Post.
window._check = async () => {
  document.activeElement && document.activeElement.blur();
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  await wait(800);
  const ed = document.querySelector(".public-DraftEditor-content");
  return {
    btn: [...document.querySelectorAll("button")]
      .filter((b) => b.offsetParent && ["Schedule", "Post"].includes(b.innerText.trim()))
      .map((b) => b.innerText.trim()),
    sched: document.querySelector("input[value=schedule]").checked,
    vals: [...document.querySelectorAll("input")]
      .filter((i) => i.offsetParent && /^\d{1,4}[-:]/.test(i.value))
      .map((i) => i.value),
    title: document.querySelector('input[placeholder="Add a catchy title"]').value,
    desc: ed.innerText,
    tags: [...ed.querySelectorAll('[class*="mention"]')].map((e) => e.innerText),
    sound: _sound(),
    photos: document.body.innerText.match(/\d+\/\d+(?=\s)/g),
  };
};
"studio helpers loaded";
