const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * A release date as the calendar tile shows it. IGDB files a game with only a
 * year or a month under the last day of that period (2027-12-31), which would
 * read as a real date, so a post overrides those with "2027" or "2027-03".
 */
export const releaseParts = (date) => {
  const [year, month, day] = String(date).split("-");
  if (!month) return { year, exact: false };
  const name = MONTHS[Number(month) - 1];
  if (!name) throw new Error(`release date ${date} has no month ${month}`);
  if (!day) return { year, month: name, exact: false };
  return { year, month: name, day: String(Number(day)), exact: true };
};

const DAY = 24 * 60 * 60 * 1000;

/** Whole days from the day a post goes out to a release, both as dates. */
export const daysBetween = (from, to) =>
  Math.round((Date.parse(to) - Date.parse(from)) / DAY);

/**
 * How far off a release is on the day the post goes out. Days, even into the
 * hundreds: an exact count reads as a countdown, "4 months" as a shrug.
 */
export const countdown = (days) => {
  if (days < 0) return { lead: "Out", figure: "now", unit: "" };
  if (days === 0) return { lead: "Out", figure: "today", unit: "" };
  if (days === 1) return { lead: "Out", figure: "tomorrow", unit: "" };
  if (days <= 365) return { lead: "In", figure: String(days), unit: "days" };
  return {
    lead: "In",
    figure: String(Math.round(days / 30.44)),
    unit: "months",
  };
};

/** Orders releases soonest first, with a game known only by its month or
 *  year after everything dated within that month or year. */
export const releaseOrder = (a, b) => {
  const key = (date) => {
    const [year, month = "99", day = "99"] = String(date).split("-");
    return `${year}-${month}-${day}`;
  };
  return key(a).localeCompare(key(b));
};
