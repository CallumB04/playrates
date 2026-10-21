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

/** One post a day, in the evening, Estonian time. A 16:00 slot was tried
 *  for three days in October and drew a hundredth of the evening's views. */
export const SLOTS = ["21:00"];

/**
 * Photo or video for the next post: the other kind from the last one, so the
 * two alternate. `kinds` is `true` for each video so far, in posting order.
 * The skill can overrule it to try a new format.
 */
export const nextKind = (kinds) =>
  kinds.length ? !kinds[kinds.length - 1] : false;

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
