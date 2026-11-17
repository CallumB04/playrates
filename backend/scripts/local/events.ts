/**
 * The local stack's events: an awards night in the shape of The Game Awards
 * 2026 with picks open, last year's with its winners out, and a showcase
 * on now, a different kind of event altogether. The nominees and reveals
 * are this catalogue's own picks, made up for local use; the real ones go
 * in through admin. People, creators, teams and the showcase are made up.
 */

type Row = Record<string, unknown>;

interface CatalogueGame {
  id: number;
  title: string;
  has_sexual_content?: boolean;
  igdb_rating_count?: number | null;
}

/** A nominee: a game by its title, or a name with an optional game. */
type Nominee = string | { label: string; detail?: string; game?: string };

interface Category {
  name: string;
  section: string;
  blurb?: string;
  nominees: Nominee[];
  /** Last year's: which one won, by its place in the list. */
  winner?: number;
}

const SECTIONS = {
  craft: "Craft",
  genres: "Genres",
  indies: "Indies, mobile and VR",
  community: "Community and impact",
  esports: "Creators and esports",
};

const THIS_YEAR: Category[] = [
  {
    name: "Game of the Year",
    section: "",
    blurb: "The one award every other one leads up to.",
    nominees: [
      "Resident Evil Requiem",
      "Marvel's Wolverine",
      "007 First Light",
      "Pragmata",
      "Saros",
      "Nioh 3",
    ],
  },
  {
    name: "Best Game Direction",
    section: SECTIONS.craft,
    nominees: [
      "Marvel's Wolverine",
      "Resident Evil Requiem",
      "Saros",
      "Pragmata",
      "007 First Light",
      "Crimson Desert Enhanced",
    ],
  },
  {
    name: "Best Narrative",
    section: SECTIONS.craft,
    nominees: [
      "007 First Light",
      "Resident Evil Requiem",
      "Mixtape",
      "Marvel's Wolverine",
      "Control Resonant",
      "Esoteric Ebb",
    ],
  },
  {
    name: "Best Art Direction",
    section: SECTIONS.craft,
    nominees: [
      "Mixtape",
      "Pragmata",
      "Mina the Hollower",
      "Crimson Desert Enhanced",
      "Reanimal",
      "Saros",
    ],
  },
  {
    name: "Best Score and Music",
    section: SECTIONS.craft,
    nominees: [
      "Saros",
      "Mixtape",
      "Nioh 3",
      "Marvel's Wolverine",
      "Pragmata",
      "Slay the Spire II",
    ],
  },
  {
    name: "Best Audio Design",
    section: SECTIONS.craft,
    nominees: [
      "Resident Evil Requiem",
      "Saros",
      "Marathon",
      "Forza Horizon 6",
      "Reanimal",
      "007 First Light",
    ],
  },
  {
    name: "Best Performance",
    section: SECTIONS.craft,
    nominees: [
      { label: "Marlowe Hart", detail: "Grace", game: "Resident Evil Requiem" },
      { label: "Theo Adeyemi", detail: "James Bond", game: "007 First Light" },
      { label: "Ines Calder", detail: "Diana", game: "Pragmata" },
      { label: "Ravi Sandhu", detail: "Logan", game: "Marvel's Wolverine" },
      { label: "June Okafor", detail: "Arjun", game: "Saros" },
      { label: "Petra Lind", detail: "Rockett", game: "Mixtape" },
    ],
  },
  {
    name: "Best Action Game",
    section: SECTIONS.genres,
    nominees: [
      "Saros",
      "Nioh 3",
      "Marathon",
      "Pragmata",
      "Mouse: P.I. For Hire",
      "Highguard",
    ],
  },
  {
    name: "Best Action/Adventure Game",
    section: SECTIONS.genres,
    nominees: [
      "Marvel's Wolverine",
      "Resident Evil Requiem",
      "007 First Light",
      "Pragmata",
      "Onimusha: Way of the Sword",
      "Crimson Desert Enhanced",
    ],
  },
  {
    name: "Best RPG",
    section: SECTIONS.genres,
    nominees: [
      "Nioh 3",
      "Dragon Quest VII Reimagined",
      "The Blood of Dawnwalker",
      "Monster Hunter Stories 3: Twisted Reflection",
      "Arknights: Endfield",
      "Code Vein II",
    ],
  },
  {
    name: "Best Fighting Game",
    section: SECTIONS.genres,
    nominees: [
      "2XKO",
      "Marvel Tokon: Fighting Souls",
      "Invincible Vs.",
      "Avatar Legends: The Fighting Game",
      "Dead as Disco",
    ],
  },
  {
    name: "Best Family Game",
    section: SECTIONS.genres,
    nominees: [
      "Pokémon Pokopia",
      "Tomodachi Life: Living the Dream",
      "LEGO Batman: Legacy of the Dark Knight",
      "Mario Tennis Fever",
      "Splatoon Raiders",
      "Star Fox",
    ],
  },
  {
    name: "Best Sim/Strategy Game",
    section: SECTIONS.genres,
    nominees: [
      "Mewgenics",
      "Star Wars Zero Company",
      "Timberborn",
      "Going Medieval",
      "Heroes of Might & Magic: Olden Era",
    ],
  },
  {
    name: "Best Sports/Racing Game",
    section: SECTIONS.genres,
    nominees: [
      "Forza Horizon 6",
      "Mario Tennis Fever",
      "Screamer",
      "Denshattack!",
      "MLB The Show 26",
    ],
  },
  {
    name: "Best Multiplayer Game",
    section: SECTIONS.genres,
    nominees: [
      "Marathon",
      "Highguard",
      "2XKO",
      "Splatoon Raiders",
      "Hytale",
      "Palworld",
    ],
  },
  {
    name: "Best Independent Game",
    section: SECTIONS.indies,
    nominees: [
      "Mewgenics",
      "Mina the Hollower",
      "Slay the Spire II",
      "Mixtape",
      "Replaced",
      "Cairn",
    ],
  },
  {
    name: "Best Debut Indie Game",
    section: SECTIONS.indies,
    nominees: [
      "Mouse: P.I. For Hire",
      "Replaced",
      "Darwin's Paradox!",
      "Esoteric Ebb",
      "Mio: Memories in Orbit",
    ],
  },
  {
    name: "Best Mobile Game",
    section: SECTIONS.indies,
    nominees: [
      "Arknights: Endfield",
      "NTE: Neverness to Everness",
      "The Seven Deadly Sins: Origin",
      "Pokémon Champions",
      "Heartopia",
    ],
  },
  {
    name: "Best VR/AR Game",
    section: SECTIONS.indies,
    // No headset games in the local catalogue: names stand in for them.
    nominees: [
      { label: "Hollowpoint Drift", detail: "Meta Quest" },
      { label: "Lantern Keeper", detail: "PlayStation VR2" },
      { label: "Orbital Kitchen", detail: "Meta Quest" },
      { label: "Ninefold", detail: "Steam VR" },
      { label: "Tidewalker", detail: "Apple Vision Pro" },
    ],
  },
  {
    name: "Best Ongoing Game",
    section: SECTIONS.community,
    nominees: [
      "Fortnite",
      "Marvel Rivals",
      "Helldivers 2",
      "Final Fantasy XIV Online",
      "ARC Raiders",
    ],
  },
  {
    name: "Best Community Support",
    section: SECTIONS.community,
    nominees: [
      "No Man's Sky",
      "Helldivers 2",
      "Palworld",
      "Valheim",
      "Deep Rock Galactic",
    ],
  },
  {
    name: "Games for Impact",
    section: SECTIONS.community,
    nominees: [
      "Cairn",
      "Mixtape",
      "Esoteric Ebb",
      "Will: Follow the Light",
      "Big Walk",
    ],
  },
  {
    name: "Innovation in Accessibility",
    section: SECTIONS.community,
    nominees: [
      "Forza Horizon 6",
      "Marvel's Wolverine",
      "Resident Evil Requiem",
      "007 First Light",
      "Saros",
    ],
  },
  {
    name: "Best Adaptation",
    section: SECTIONS.community,
    nominees: [
      { label: "The Super Mario Galaxy Movie", detail: "Film" },
      { label: "Mortal Kombat II", detail: "Film" },
      { label: "Fallout", detail: "Series, season 2" },
      { label: "Street Fighter", detail: "Film" },
      { label: "Resident Evil", detail: "Film" },
    ],
  },
  {
    name: "Most Anticipated Game",
    section: SECTIONS.community,
    nominees: [
      "Grand Theft Auto VI",
      "Fable",
      "Kingdom Hearts IV",
      "Intergalactic: The Heretic Prophet",
      "Clockwork Revolution",
      "Marvel 1943: Rise of Hydra",
    ],
  },
  {
    name: "Players’ Voice",
    section: SECTIONS.community,
    blurb: "The one the public decides.",
    nominees: [
      "Resident Evil Requiem",
      "Marvel's Wolverine",
      "Forza Horizon 6",
      "Pokémon Pokopia",
      "007 First Light",
      "Arknights: Endfield",
    ],
  },
  {
    name: "Content Creator of the Year",
    section: SECTIONS.esports,
    nominees: [
      { label: "Pixel Parlour", detail: "YouTube" },
      { label: "SaveScum Sam", detail: "Twitch" },
      { label: "Lore Lantern", detail: "YouTube" },
      { label: "Coop Kitchen", detail: "TikTok" },
      { label: "Frame Perfect Fi", detail: "Twitch" },
    ],
  },
  {
    name: "Best Esports Game",
    section: SECTIONS.esports,
    nominees: [
      "Counter-Strike 2",
      "League of Legends",
      "Valorant",
      "Dota 2",
      "Marvel Rivals",
    ],
  },
  {
    name: "Best Esports Athlete",
    section: SECTIONS.esports,
    nominees: [
      { label: "Kestrel", detail: "Northwind" },
      { label: "Valkyr", detail: "Glasshouse" },
      { label: "Moth", detail: "Redline Collective" },
      { label: "Sundial", detail: "Ember Nine" },
      { label: "Quill", detail: "Northwind" },
    ],
  },
  {
    name: "Best Esports Team",
    section: SECTIONS.esports,
    nominees: [
      { label: "Northwind", detail: "Counter-Strike 2" },
      { label: "Glasshouse", detail: "Valorant" },
      { label: "Redline Collective", detail: "League of Legends" },
      { label: "Ember Nine", detail: "Dota 2" },
      { label: "Paper Lions", detail: "Marvel Rivals" },
    ],
  },
];

/** Last year's, with its winners out: enough to draw the results. */
const LAST_YEAR: Category[] = [
  {
    name: "Game of the Year",
    section: "",
    nominees: [
      "Clair Obscur: Expedition 33",
      "Death Stranding 2: On the Beach",
      "Donkey Kong Bananza",
      "Hades II",
      "Hollow Knight: Silksong",
      "Kingdom Come: Deliverance II",
    ],
    winner: 0,
  },
  {
    name: "Best Independent Game",
    section: SECTIONS.indies,
    nominees: [
      "Clair Obscur: Expedition 33",
      "Ball x Pit",
      "Blue Prince",
      "Hades II",
      "Hollow Knight: Silksong",
    ],
    winner: 0,
  },
  {
    name: "Best Action Game",
    section: SECTIONS.genres,
    nominees: [
      "Hades II",
      "Battlefield 6",
      "Doom: The Dark Ages",
      "Ninja Gaiden 4",
    ],
    winner: 0,
  },
  {
    name: "Best Family Game",
    section: SECTIONS.genres,
    nominees: ["Donkey Kong Bananza", "Mario Kart World", "Split Fiction"],
    winner: 0,
  },
  {
    name: "Best Multiplayer Game",
    section: SECTIONS.genres,
    nominees: [
      "ARC Raiders",
      "Battlefield 6",
      "Elden Ring Nightreign",
      "Peak",
      "Split Fiction",
    ],
    winner: 0,
  },
  {
    name: "Best Ongoing Game",
    section: SECTIONS.community,
    nominees: [
      "No Man's Sky",
      "Final Fantasy XIV Online",
      "Fortnite",
      "Helldivers 2",
      "Marvel Rivals",
    ],
    winner: 0,
  },
];

/** A made-up showcase's running order: a game by its title, or a name for
 *  one without a page yet. */
const REVEALS: { game?: string; label?: string; tag: string }[] = [
  { label: "A new game from the makers of Control", tag: "premiere" },
  { game: "Fable", tag: "gameplay" },
  { game: "Phantom Blade Zero", tag: "date" },
  { game: "Kingdom Hearts IV", tag: "trailer" },
  { game: "Intergalactic: The Heretic Prophet", tag: "gameplay" },
  { game: "The Legend of Zelda: Ocarina of Time", tag: "remake" },
  { game: "Marvel 1943: Rise of Hydra", tag: "date" },
  { game: "Clockwork Revolution", tag: "trailer" },
  { game: "Mortal Shell II", tag: "shadow-drop" },
  { game: "Grand Theft Auto VI", tag: "trailer" },
];

const slugify = (text: string) =>
  text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** Its own sequence, so adding events doesn't shuffle the rest of the
 *  seeded world. */
const random = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export const eventRows = ({
  games,
  now,
  tester,
  members,
}: {
  games: CatalogueGame[];
  now: Date;
  tester: string;
  /** Everyone else who picks, the newcomer left out. */
  members: string[];
}) => {
  const r = random(20261117);
  // The best known of a title, where the catalogue has two.
  const byTitle = new Map<string, CatalogueGame>();
  for (const game of games) {
    if (game.has_sexual_content) continue;
    const key = game.title.toLowerCase();
    const held = byTitle.get(key);
    if (
      !held ||
      (game.igdb_rating_count ?? 0) > (held.igdb_rating_count ?? 0)
    ) {
      byTitle.set(key, game);
    }
  }
  const gameId = (title?: string) =>
    title ? (byTitle.get(title.toLowerCase())?.id ?? null) : null;

  const events: Row[] = [];
  const shows: Row[] = [];
  const categories: Row[] = [];
  const nominees: Row[] = [];
  const picks: Row[] = [];
  let categoryId = 1;
  let nomineeId = 1;

  const night = (
    id: number,
    event: Row,
    show: Row,
    list: Category[],
    pickers: { user: string; share: number }[],
  ) => {
    events.push({ id, ...event });
    shows.push({ event_id: id, ...show });
    list.forEach((category, position) => {
      const own: Row[] = [];
      for (const nominee of category.nominees) {
        const named = typeof nominee === "string" ? null : nominee;
        const game = gameId(named ? named.game : (nominee as string));
        // A title the catalogue hasn't got is left out, not shown blank.
        if (!named && game === null) continue;
        own.push({
          id: nomineeId++,
          category_id: categoryId,
          game_id: game,
          label: named?.label ?? null,
          detail: named?.detail ?? null,
          position: own.length,
          won: category.winner === category.nominees.indexOf(nominee),
        });
      }
      categories.push({
        id: categoryId,
        event_id: id,
        slug: slugify(category.name),
        name: category.name,
        blurb: category.blurb ?? "",
        section: category.section,
        position,
        headline: position === 0,
      });
      nominees.push(...own);
      for (const { user, share } of pickers) {
        if (own.length === 0 || r() > share) continue;
        // The first few lead, as a crowd's favourites do.
        const at = Math.min(own.length - 1, Math.floor(r() * r() * own.length));
        picks.push({
          user_id: user,
          category_id: categoryId,
          nominee_id: own[at]!.id,
        });
      }
      categoryId += 1;
    });
  };

  const day = 86_400_000;
  // This year's show a few weeks off, at the evening in Los Angeles it is.
  const show = new Date(now.getTime() + 24 * day);
  show.setUTCHours(3, 30, 0, 0);
  const lastShow = new Date(show.getTime() - 364 * day);
  const published = new Date(now.getTime() - 2 * day);

  const frame = {
    kind: "awards",
    organiser: "The Game Awards",
    organiser_url: "https://thegameawards.com",
    watch_url: "https://thegameawards.com",
    logo: "the-game-awards",
    // Every row names every column: the insert takes them from the first.
    ends_at: null,
  };

  night(
    1,
    {
      ...frame,
      slug: "the-game-awards-2026",
      name: "The Game Awards 2026",
      tagline: "Call every winner before the show.",
      about:
        "The year’s best games, honoured live, with world premieres of what’s coming next between the awards.\n\nMake a pick in every category before the show starts, log the nominees you’ve played, and see how everyone else on PlayRates called it. The winners show here as they’re announced.",
      starts_at: show,
      published_at: published,
    },
    { picks_close_at: show, results_at: null },
    THIS_YEAR,
    [
      // The tester part way through, as someone halfway down the page is.
      { user: tester, share: 0.35 },
      ...// A few already all the way through, for a Full ballot to count.
      members.map((user, i) => ({
        user,
        share: i < 4 ? 1 : 0.4 + r() * 0.5,
      })),
    ],
  );
  night(
    2,
    {
      ...frame,
      slug: "the-game-awards-2025",
      name: "The Game Awards 2025",
      tagline: "See who won, and who saw it coming.",
      about: "",
      starts_at: lastShow,
      published_at: new Date(lastShow.getTime() - 24 * day),
    },
    {
      picks_close_at: lastShow,
      results_at: new Date(lastShow.getTime() + 3 * 60 * 60 * 1000),
    },
    LAST_YEAR,
    [tester, ...members].map((user) => ({ user, share: 0.9 })),
  );

  // A showcase on now, over a weekend: nothing about it is an award.
  const showcaseId = 3;
  const reveals: Row[] = [];
  const hype: Row[] = [];
  REVEALS.forEach((reveal, position) => {
    const game = gameId(reveal.game);
    if (reveal.game && game === null) return;
    reveals.push({
      id: position + 1,
      event_id: showcaseId,
      game_id: game,
      label: reveal.label ?? null,
      tag: reveal.tag,
      position,
    });
  });
  for (const user of [tester, ...members]) {
    for (const reveal of reveals) {
      // The last reveals, the biggest, draw the most.
      const pull = 0.25 + (Number(reveal.position) / reveals.length) * 0.5;
      if (r() < pull) hype.push({ user_id: user, reveal_id: reveal.id });
    }
  }
  events.push({
    id: showcaseId,
    kind: "showcase",
    slug: "winter-showcase-2026",
    name: "Winter Showcase 2026",
    tagline: "New games all weekend. Hype the ones you want.",
    about:
      "Three nights of reveals, from the biggest games of next year to ones nobody saw coming. Hype each one you can’t wait for, add it to your wishlist, and see what everyone else is most excited about.",
    starts_at: new Date(now.getTime() - 26 * 60 * 60 * 1000),
    ends_at: new Date(now.getTime() + 46 * 60 * 60 * 1000),
    organiser: "Northlight Live",
    organiser_url: null,
    watch_url: null,
    logo: null,
    published_at: new Date(now.getTime() - 9 * day),
  });

  return {
    events,
    shows,
    categories,
    nominees,
    picks,
    showcases: [{ event_id: showcaseId }],
    reveals,
    hype,
  };
};

/**
 * Badges as the site would have given them: a full ballot to whoever picked
 * in every category, the results badges worked out from last year's
 * winners, and the showcase's to whoever hyped while it's been on.
 */
export const eventBadgesSql = `insert into public.event_badges (user_id, event_id, badge)
select p.user_id, c.event_id, 'full-ballot'
from public.award_picks p
join public.award_categories c on c.id = p.category_id
group by p.user_id, c.event_id
having count(*) = (
    select count(*) from public.award_categories c2
    where c2.event_id = c.event_id
      and exists (select 1 from public.award_nominees n where n.category_id = c2.id)
);
select public.refresh_award_result_badges(id) from public.events where kind = 'awards';
insert into public.event_badges (user_id, event_id, badge)
select distinct h.user_id, r.event_id, 'front-row'
from public.showcase_hype h join public.showcase_reveals r on r.id = h.reveal_id;
insert into public.event_badges (user_id, event_id, badge)
select h.user_id, r.event_id, 'hype-train'
from public.showcase_hype h join public.showcase_reveals r on r.id = h.reveal_id
group by h.user_id, r.event_id
having count(*) >= 5;`;
