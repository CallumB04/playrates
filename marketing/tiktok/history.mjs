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

/** One post a day, between these times, Estonian time. A 16:00 slot was
 *  tried for three days in October and drew a hundredth of the evening's
 *  views; a different minute each day is what a person posting by hand does. */
export const WINDOW = ["19:30", "21:00"];

const minutes = (time) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

export const inWindow = (time) =>
  /^\d{2}:\d{2}$/.test(time) &&
  minutes(time) >= minutes(WINDOW[0]) &&
  minutes(time) <= minutes(WINDOW[1]);

/** A minute in the window at random, as "HH:MM". */
export const randomTime = (random = Math.random) => {
  const [from, to] = WINDOW.map(minutes);
  const t = from + Math.floor(random() * (to - from + 1));
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
};
