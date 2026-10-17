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

/** How many recent posts the video/photo balance is judged over. */
export const WINDOW = 10;

/**
 * Video or photo for the next post, aiming at half and half: never three of
 * one kind in a row, otherwise whichever kind the last WINDOW posts have
 * fewer of, and a coin toss on a tie. `kinds` is `true` for each video so
 * far, in posting order. The skill can overrule it for the day.
 */
export const pickKind = (kinds, random = Math.random) => {
  const [a, b] = kinds.slice(-2);
  if (kinds.length >= 2 && a === b) return !a;
  const recent = kinds.slice(-WINDOW);
  const videos = recent.filter(Boolean).length;
  const photos = recent.length - videos;
  if (videos !== photos) return videos < photos;
  return random() < 0.5;
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
