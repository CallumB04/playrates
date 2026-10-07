/**
 * The words the made-up community uses. Varied enough that two profiles
 * side by side don't read as one template, and plain enough not to date.
 */

export interface Person {
  username: string;
  firstName: string;
  bio: string;
  /** The consoles they mostly play on, most used first. */
  consoles: string[];
  timezone: string;
}

const TIMEZONES = [
  "Europe/London",
  "Europe/Berlin",
  "Europe/Madrid",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "America/Toronto",
  "Australia/Sydney",
  "Asia/Tokyo",
  "Europe/Stockholm",
];

const SETUPS = [
  ["playstation5", "playstation4"],
  ["nintendo-switch"],
  ["steam"],
  ["xbox-series-x", "xbox-one"],
  ["steam", "nintendo-switch"],
  ["playstation5", "steam"],
  ["steam", "xbox-series-x"],
  ["playstation4", "nintendo-switch"],
  ["playstation5", "nintendo-switch", "steam"],
  ["steam", "macos"],
];

const PEOPLE: [string, string, string][] = [
  ["marlowe", "Marlowe", "Slow burn RPGs and anything with a good map."],
  ["tessellate", "Tess", "Puzzle games, mostly. Occasionally a shooter."],
  ["quietriver", "Sam", "Finishing things is the hard part."],
  ["halcyon", "Iris", "Backlog of shame, proudly maintained."],
  ["nightjar", "Noor", "Horror and survival. Nothing cosy."],
  ["obsidian", "Obi", "100% or nothing."],
  ["pixelwren", "Wren", "Pixel art, short games, long walks."],
  ["frostbyte", "Jonah", "Speedrunning badly since 2009."],
  ["cinderlane", "Priya", "JRPGs on the train, soulslikes at home."],
  ["boltcutter", "Marcus", "If it has a co-op mode, I'm in."],
  ["mossgarden", "Elin", "Cosy games and the occasional horror detour."],
  ["redshift", "Kofi", "Racing sims and strategy. Strange mix, I know."],
  ["latewatch", "Dani", "Plays after midnight. Reviews before coffee."],
  ["sunspotter", "Aiko", "Nintendo for life."],
  ["grimoire", "Felix", "Tabletop at heart, CRPGs on screen."],
  ["tidewater", "Maya", "Narrative games that stay with you."],
  ["hexagonal", "Ravi", "Roguelikes until my eyes give out."],
  ["ironclad", "Bea", "Shooters, fighters, anything competitive."],
  ["wanderling", "Leo", "Open worlds, all of them, slowly."],
  ["copperpot", "Hana", "Retro collector. Will talk about CRTs."],
  ["glasswing", "Ines", "Here for the soundtracks."],
  ["thornfield", "Owen", "Survival crafting and base building."],
  ["lumen", "Zara", "Indies first. Big releases when they're cheap."],
  ["quarterback", "Theo", "Sports games and nothing else, apparently."],
  ["vellichor", "Clara", "Mystery and detective games."],
  ["pathfinder", "Arun", "Metroidvanias. Map at 100% or it didn't happen."],
  ["seabright", "Nell", "Handheld only these days."],
  ["kestrel", "Jamie", "Stealth games, played very loudly."],
  ["oldgrowth", "Mateo", "Strategy and city builders."],
  ["ambergris", "Yuki", "Visual novels and rhythm games."],
  ["northstar", "Freya", "Bit of everything. Mostly Zelda."],
  ["dustjacket", "Ezra", "Plays the classics I missed the first time."],
  ["redwing", "Lina", "Fighting games. Ask me about frame data."],
  ["saltmarsh", "Callan", "Couch co-op with my kids."],
  ["paperlantern", "Mei", "Cosy, cute, and occasionally devastating."],
  ["blackthorn", "Ivan", "FromSoftware or bust."],
  ["meridian", "Ana", "Long RPGs. I have time."],
  ["foxglove", "Rosa", "Horror, but only with the lights on."],
];

export const COMMUNITY: Person[] = PEOPLE.map(
  ([username, firstName, bio], i) => ({
    username,
    firstName,
    bio,
    consoles: SETUPS[i % SETUPS.length]!,
    timezone: TIMEZONES[i % TIMEZONES.length]!,
  }),
);

const OPENERS = [
  "Held up far better than I expected.",
  "I bounced off this twice before it clicked.",
  "Not much here I hadn't seen elsewhere, but all of it done well.",
  "This is the one I keep recommending.",
  "Went in with low expectations and came out a fan.",
  "A slow start, and then it doesn't let go.",
  "Gorgeous from the first minute.",
  "I wanted to love this more than I did.",
  "Mechanically superb.",
  "It does one thing and does it brilliantly.",
  "Somehow better on a second playthrough.",
  "The opening hours are some of the best I've played.",
];

const MIDDLES = [
  "The middle act drags, but the ending earns it.",
  "Every system feeds the next one, which is rare to see this tidy.",
  "The writing carries it through a few rough patches.",
  "Combat took a while to click, then became the best part.",
  "It trusts you to work things out, and that makes the wins land.",
  "Side content is genuinely worth doing for once.",
  "The difficulty spikes are real, but fair once you learn the patterns.",
  "Performance was shaky in places, never enough to spoil it.",
  "The soundtrack is doing a lot of heavy lifting, happily.",
  "Exploration is the star; the story is fine.",
  "Too long by about ten hours, but I'd still go back.",
  "The pacing is near perfect.",
];

const CLOSERS = [
  "Worth it for the movement alone.",
  "Give it four hours before you decide.",
  "Easy recommendation.",
  "Play it on the biggest screen you have.",
  "I'll be thinking about the ending for a while.",
  "Glad I finally got round to it.",
  "Not for everyone, but it was for me.",
  "Would happily start it again tomorrow.",
  "A modern classic, and it knows it.",
  "Wait for a sale, but do play it.",
];

const CONSOLE_NOTES: Record<string, string[]> = {
  "nintendo-switch": [
    "The Switch port holds up well in handheld, though it dips in busy scenes.",
    "Handheld is the way to play this one.",
  ],
  playstation5: [
    "Smooth at 60 on PS5, and the haptics are put to good use.",
    "Loads in seconds on PS5, which changes how it feels to play.",
  ],
  playstation4: ["Runs fine on a base PS4, if a little loud."],
  steam: [
    "Plays great on PC with a controller.",
    "Modded it a little on PC and never looked back.",
  ],
  "xbox-series-x": ["Quick Resume made it perfect for short sessions."],
};

export const reviewBody = (r: () => number, system: string | null): string => {
  const pick = <T>(xs: T[]) => xs[Math.floor(r() * xs.length)]!;
  const parts = [pick(OPENERS), pick(MIDDLES)];
  const note = system ? CONSOLE_NOTES[system] : undefined;
  if (note && r() < 0.6) parts.push(pick(note));
  parts.push(pick(CLOSERS));
  return parts.join(" ");
};

export const THREAD_TITLES = [
  (t: string) => `Just finished ${t}. Thoughts?`,
  (t: string) => `Is ${t} worth it in 2026?`,
  (t: string) => `Tips for a first playthrough of ${t}`,
  (t: string) => `Underrated moments in ${t}`,
  (t: string) => `Which platform did you play ${t} on?`,
  (t: string) => `${t}: the ending (spoilers)`,
  (t: string) => `Favourite soundtrack moment in ${t}?`,
  (t: string) => `${t} took me 3 attempts to get into`,
];

export const OPENING_POSTS = [
  "Finally rolled the credits last night and I need to talk about it with someone.",
  "Thinking of starting this. Anything you wish you'd known going in?",
  "Curious where everyone landed on this one. It seems to split people.",
  "I keep coming back to this one. What is it about it?",
  "Started it on a whim and now it's all I want to play.",
];

export const REPLIES = [
  "Completely agree, the last few hours are something else.",
  "Don't rush the side areas, they're where it shines.",
  "I played it on Switch first and then again on PC. Both great, PC looks nicer.",
  "Hard disagree, I think the second half is stronger.",
  "Turn the music up. Trust me.",
  "It took me a while too. Stick with it past the first boss.",
  "This was my game of the year when it came out.",
  "The difficulty curve put me off at first, not going to lie.",
  "Same here. Finished it twice now.",
  "Good shout. I'd add: explore everything before the point of no return.",
  "Honestly one of the best openings in the genre.",
  "I'm halfway through and avoiding this thread now, see you on the other side.",
];
