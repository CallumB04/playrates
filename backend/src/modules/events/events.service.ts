import {
  EVENT_BADGES,
  eventTiming,
  isCurrentEvent,
  type AdminEventInput,
  type EventDetail,
  type EventSummary,
  type GameEventEntry,
  type HeldEventBadge,
} from "@playrates/shared";
import { AppError } from "../../lib/AppError.js";
import type { EventRow, EventsRepository } from "./events.repository.js";
import { NO_CARD, type EventKindParts, type KindCard } from "./kinds.js";

const frame = (row: EventRow, at: Date) => ({
  id: row.id,
  slug: row.slug,
  kind: row.kind,
  name: row.name,
  tagline: row.tagline,
  startsAt: row.starts_at,
  endsAt: row.ends_at,
  timing: eventTiming({ startsAt: row.starts_at, endsAt: row.ends_at }, at),
  organiser: row.organiser,
  organiserUrl: row.organiser_url,
  watchUrl: row.watch_url,
  logo: row.logo as EventSummary["logo"],
  publishedAt: row.published_at,
});

const times = (row: EventRow) => ({
  publishedAt: row.published_at,
  startsAt: row.starts_at,
  endsAt: row.ends_at,
});

/**
 * Events, whatever their kind: the frame they share, with each kind's own
 * part read in from `kinds`. Reads only touch the database, so the pages
 * router uses this too.
 */
export const createEventsService = ({
  repo,
  kinds,
  now = () => new Date(),
}: {
  repo: EventsRepository;
  kinds: EventKindParts;
  now?: () => Date;
}) => {
  const summaries = async (rows: EventRow[]): Promise<EventSummary[]> => {
    const at = now();
    const cards = new Map<number, KindCard>();
    for (const kind of new Set(rows.map((row) => row.kind))) {
      const own = await kinds[kind].cards(
        rows.filter((row) => row.kind === kind),
        at,
      );
      for (const [id, card] of own) cards.set(id, card);
    }
    return rows.map((row) => ({
      ...frame(row, at),
      ...(cards.get(row.id) ?? NO_CARD),
    }));
  };

  const detail = async (row: EventRow): Promise<EventDetail> => {
    const at = now();
    const [part, counts] = await Promise.all([
      kinds[row.kind].detail(row, at),
      repo.badgeCounts(row.id),
    ]);
    return {
      ...frame(row, at),
      about: row.about,
      ...part,
      badges: EVENT_BADGES[row.kind].map((badge) => ({
        ...badge,
        earned: counts.find((c) => c.badge === badge.key)?.earned ?? 0,
      })),
    };
  };

  const published = async (slug: string): Promise<EventRow> => {
    const row = await repo.findBySlug(slug);
    if (!row?.published_at) throw AppError.notFound("Event");
    return row;
  };

  const eventOf = async (id: number): Promise<EventRow> => {
    const row = await repo.findById(id);
    if (!row) throw AppError.notFound("Event");
    return row;
  };

  const adminGet = async (id: number) => detail(await eventOf(id));

  const fields = (input: AdminEventInput) => ({
    slug: input.slug,
    name: input.name,
    tagline: input.tagline,
    about: input.about,
    starts_at: input.startsAt,
    ends_at: input.endsAt,
    organiser: input.organiser,
    organiser_url: input.organiserUrl,
    watch_url: input.watchUrl,
    logo: input.logo,
  });

  return {
    async list(): Promise<EventSummary[]> {
      return summaries(await repo.list(true));
    },

    /** The event home leads with: one on now, else the soonest to come,
     *  else the one just gone. */
    async current(): Promise<EventSummary | null> {
      const at = now();
      const current = (await repo.list(true)).filter((row) =>
        isCurrentEvent(times(row), at),
      );
      const when = (row: EventRow) =>
        eventTiming({ startsAt: row.starts_at, endsAt: row.ends_at }, at);
      const start = (row: EventRow) => Date.parse(row.starts_at);
      const lead =
        current.find((row) => when(row) === "live") ??
        current
          .filter((row) => when(row) === "upcoming")
          .sort((a, b) => start(a) - start(b))[0] ??
        current.sort((a, b) => start(b) - start(a))[0];
      return lead ? ((await summaries([lead]))[0] ?? null) : null;
    },

    /** Null for a draft or no such event: a draft is as good as absent. */
    async findPublished(slug: string): Promise<EventDetail | null> {
      const row = await repo.findBySlug(slug);
      return row?.published_at ? detail(row) : null;
    },

    async bySlug(slug: string): Promise<EventDetail> {
      return detail(await published(slug));
    },

    /** Your badges from an event, by key. */
    async badgesOf(userId: string, slug: string): Promise<string[]> {
      return repo.badgesOf(userId, (await published(slug)).id);
    },

    /** Every event badge someone holds, newest first. Only from events
     *  still published: one taken down takes its badges off show too. */
    async heldBy(userId: string): Promise<HeldEventBadge[]> {
      const rows = await repo.badgesOfUser(userId);
      if (rows.length === 0) return [];
      const events = new Map(
        (await repo.findByIds([...new Set(rows.map((r) => r.event_id))]))
          .filter((event) => event.published_at)
          .map((event) => [event.id, event]),
      );
      return rows
        .flatMap((row) => {
          const event = events.get(row.event_id);
          const def = event
            ? EVENT_BADGES[event.kind].find((b) => b.key === row.badge)
            : undefined;
          if (!event || !def) return [];
          return [
            {
              ...def,
              earnedAt: row.earned_at,
              event: {
                slug: event.slug,
                name: event.name,
                startsAt: event.starts_at,
                logo: event.logo as HeldEventBadge["event"]["logo"],
              },
            },
          ];
        })
        .sort((a, b) => Date.parse(b.earnedAt) - Date.parse(a.earnedAt));
    },

    /** Everywhere a game has turned up, whatever the kind of event: those
     *  on or still to come first, soonest first, then the rest, latest
     *  first. */
    async forGame(gameId: number): Promise<GameEventEntry[]> {
      const at = now();
      const found = new Map<number, Omit<GameEventEntry, "event">>();
      for (const part of Object.values(kinds)) {
        for (const [id, entry] of await part.forGame(gameId, at)) {
          found.set(id, entry);
        }
      }
      if (found.size === 0) return [];
      const rows = (await repo.findByIds([...found.keys()])).filter(
        (row) => row.published_at,
      );
      const cards = new Map(
        (await summaries(rows)).map((card) => [card.id, card]),
      );
      return rows
        .map((row) => {
          const card = cards.get(row.id)!;
          return {
            event: {
              slug: card.slug,
              kind: card.kind,
              name: card.name,
              startsAt: card.startsAt,
              endsAt: card.endsAt,
              timing: card.timing,
              logo: card.logo,
              artworkUrl: card.artworkUrl,
              artworks: card.artworks,
            },
            ...found.get(row.id)!,
          };
        })
        .sort((a, b) => {
          const pastA = a.event.timing === "past";
          const pastB = b.event.timing === "past";
          if (pastA !== pastB) return Number(pastA) - Number(pastB);
          const gap =
            Date.parse(a.event.startsAt) - Date.parse(b.event.startsAt);
          return pastA ? -gap : gap;
        });
    },

    /* ------------------------------------------------------------ admin */

    async adminList(): Promise<EventSummary[]> {
      return summaries(await repo.list(false));
    },

    adminGet,

    async create(input: AdminEventInput): Promise<EventDetail> {
      const row = await repo.insert({ kind: input.kind, ...fields(input) });
      await kinds[input.kind].save(row.id, input);
      return detail(row);
    },

    async update(id: number, input: AdminEventInput): Promise<EventDetail> {
      const row = await eventOf(id);
      if (row.kind !== input.kind) {
        throw AppError.validation("An event can't change its kind");
      }
      await repo.update(id, fields(input));
      await kinds[row.kind].save(id, input);
      return adminGet(id);
    },

    async setPublished(id: number, published: boolean): Promise<EventDetail> {
      const row = await eventOf(id);
      await repo.update(id, {
        // Publishing again keeps the first date, which says when it went up.
        published_at: published
          ? (row.published_at ?? now().toISOString())
          : null,
      });
      return adminGet(id);
    },
  };
};

export type EventsService = ReturnType<typeof createEventsService>;
