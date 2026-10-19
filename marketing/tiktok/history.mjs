/** Each post on the POSTS.md checklist, in posting order, with every date
 *  its line carries (scheduled, planned or posted). */
export const parseChecklist = (markdown) =>
  markdown
    .split("\n")
    .map((line) =>
      line.match(/^- \[( |x)\] \[([^\]]+)\]\(posts\/[^)]+\.json\)(.*)$/),
    )
    .filter(Boolean)
    .map(([, done, name, rest]) => ({
      name,
      done: done === "x",
      dates: rest.match(/\d{4}-\d{2}-\d{2}/g) ?? [],
    }));

const addDays = (date, n) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** The first day from `today` that no post on the checklist has taken. */
export const firstFreeDay = (posts, today) => {
  const taken = new Set(posts.flatMap((post) => post.dates));
  let day = today;
  while (taken.has(day)) day = addDays(day, 1);
  return day;
};

/** A day's two posts go out at these times, Estonian time: one photo and
 *  one video, swapping slots from one day to the next. */
export const SLOTS = ["16:00", "21:00"];

/**
 * Which slot the next day's video takes: the one the video didn't have on
 * the last day with both kinds, so neither kind keeps the evening. Each post
 * is `{ dates, time, video }`, `time` from its post file (21:00 if unset).
 */
export const videoSlot = (posts) => {
  const days = new Map();
  for (const { dates, time = SLOTS[1], video } of posts) {
    if (!dates[0]) continue;
    days.set(dates[0], [...(days.get(dates[0]) ?? []), { time, video }]);
  }
  const last = [...days.keys()]
    .sort()
    .reverse()
    .map((day) => days.get(day))
    .find((day) => day.some((p) => p.video) && day.some((p) => !p.video));
  const was = last?.find((p) => p.video).time;
  return was === SLOTS[0] ? SLOTS[1] : SLOTS[0];
};

/**
 * A format of the given kind at random, not the one that kind last used if
 * there's another. `formats` maps a name to `{ video }`; `history` is the
 * formats used so far, in order.
 */
export const pickFormat = (formats, video, history, random = Math.random) => {
  const ofKind = Object.keys(formats).filter(
    (name) => !!formats[name].video === video,
  );
  const last = [...history].reverse().find((name) => ofKind.includes(name));
  const choices = ofKind.length > 1 ? ofKind.filter((n) => n !== last) : ofKind;
  return choices[Math.floor(random() * choices.length)];
};
