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

/**
 * A format at random from the other kind to the last post's: a video after
 * a photo post, a photo post after a video, so the feed alternates. Within
 * the kind it's random. `formats` maps a name to `{ video }`; `random` is
 * Math.random, or a fixed value in a test.
 */
export const pickFormat = (formats, last, random = Math.random) => {
  const lastWasVideo = !!formats[last]?.video;
  const choices = Object.keys(formats).filter(
    (name) => !!formats[name].video !== lastWasVideo,
  );
  return choices[Math.floor(random() * choices.length)];
};
