import {
  type AdminRevealInput,
  type Game,
  type ShowcaseHype,
  type ShowcaseReveal,
} from "@playrates/shared";
import { AppError } from "../../../lib/AppError.js";
import type { GamesRepository } from "../../games/games.repository.js";
import { toGame } from "../../games/games.mapper.js";
import type { EventRow, EventsRepository } from "../events.repository.js";
import type { EventKindPart, KindCard, KindGameEntry } from "../kinds.js";
import type { RevealRow, ShowcaseRepository } from "./showcase.repository.js";

interface Deps {
  repo: ShowcaseRepository;
  events: Pick<EventsRepository, "findBySlug">;
  games: Pick<GamesRepository, "findByIds" | "findById">;
}

/** Reveals whose game has gone, or is hidden, drop out rather than show as
 *  a blank. */
const toReveals = (
  rows: RevealRow[],
  games: Map<number, Game>,
  hype: Map<number, number>,
): ShowcaseReveal[] =>
  rows.flatMap((row) => {
    const game = row.game_id ? (games.get(row.game_id) ?? null) : null;
    if (row.game_id && (!game || game.hasSexualContent)) return [];
    return [
      {
        id: row.id,
        game,
        label: row.label,
        tag: row.tag,
        hype: hype.get(row.id) ?? 0,
      },
    ];
  });

/** A showcase's card art: the first games it showed. */
const showcaseArt = (reveals: ShowcaseReveal[]) => {
  const games = reveals.flatMap((r) => (r.game ? [r.game] : []));
  const artworks = games.flatMap((g) => (g.artworkUrl ? [g.artworkUrl] : []));
  return {
    covers: games.flatMap((g) => (g.coverUrl ? [g.coverUrl] : [])),
    artworkUrl: artworks[0] ?? null,
    artworks,
  };
};

/**
 * Showcases: the kind's part of an event (the games it showed, in running
 * order, and the crowd's hype for each), each member's own hype, and the
 * admin's editing. Nothing here knows about awards, nor they about it.
 */
export const createShowcaseService = ({ repo, events, games }: Deps) => {
  const revealsOf = async (
    eventIds: number[],
    withHype: boolean,
  ): Promise<Map<number, ShowcaseReveal[]>> => {
    const rows = await repo.reveals(eventIds);
    const gameIds = [
      ...new Set(rows.flatMap((r) => (r.game_id ? [r.game_id] : []))),
    ];
    const gameRows = gameIds.length > 0 ? await games.findByIds(gameIds) : [];
    const gamesById = new Map(gameRows.map((row) => [row.id, toGame(row)]));
    const hype = new Map<number, number>();
    if (withHype) {
      for (const id of eventIds) {
        for (const row of await repo.hypeCounts(id)) {
          hype.set(row.reveal_id, row.hype);
        }
      }
    }
    return new Map(
      eventIds.map((id) => [
        id,
        toReveals(
          rows.filter((r) => r.event_id === id),
          gamesById,
          hype,
        ),
      ]),
    );
  };

  /** A visitor sees published showcases only. */
  const publishedShowcase = async (slug: string): Promise<EventRow> => {
    const event = await events.findBySlug(slug);
    if (!event?.published_at || event.kind !== "showcase") {
      throw AppError.notFound("Event");
    }
    return event;
  };

  const revealOf = async (id: number): Promise<RevealRow> => {
    const row = await repo.findReveal(id);
    if (!row) throw AppError.notFound("Reveal");
    return row;
  };

  const hypeOf = async (
    userId: string,
    slug: string,
  ): Promise<ShowcaseHype> => {
    const event = await publishedShowcase(slug);
    const rows = await repo.reveals([event.id]);
    return repo.hypeOf(
      userId,
      rows.map((r) => r.id),
    );
  };

  const part: EventKindPart = {
    async cards(rows, _at) {
      const ids = await repo.showcases(rows.map((e) => e.id));
      const reveals = await revealsOf(ids, false);
      const cards = new Map<number, KindCard>();
      for (const id of ids) {
        const own = reveals.get(id) ?? [];
        cards.set(id, {
          ...showcaseArt(own),
          awards: null,
          showcase: { revealCount: own.length },
        });
      }
      return cards;
    },

    async detail(event, _at) {
      const own = (await revealsOf([event.id], true)).get(event.id) ?? [];
      return {
        ...showcaseArt(own),
        awards: null,
        showcase: { revealCount: own.length, reveals: own },
      };
    },

    async save(eventId) {
      await repo.saveShowcase(eventId);
    },

    async forGame(gameId) {
      const rows = await repo.revealsForGame(gameId);
      const entries = new Map<number, KindGameEntry>();
      for (const row of rows) {
        const counts = await repo.hypeCounts(row.event_id);
        entries.set(row.event_id, {
          awards: null,
          showcase: {
            tag: row.tag,
            hype: counts.find((c) => c.reveal_id === row.id)?.hype ?? 0,
          },
        });
      }
      return entries;
    },
  };

  return {
    part,

    hypeOf,

    /** Hype for a reveal, or taken back. Open any time. */
    async setHype(
      userId: string,
      slug: string,
      revealId: number,
      on: boolean,
    ): Promise<ShowcaseHype> {
      const event = await publishedShowcase(slug);
      const reveal = await repo.findReveal(revealId);
      if (!reveal || reveal.event_id !== event.id) {
        throw AppError.notFound("Reveal");
      }
      await (on ? repo.hype(userId, revealId) : repo.unhype(userId, revealId));
      return hypeOf(userId, slug);
    },

    /* ------------------------------------------------------------ admin */

    async addReveal(eventId: number, input: AdminRevealInput): Promise<number> {
      const [showcase] = await repo.showcases([eventId]);
      if (showcase === undefined) throw AppError.notFound("Showcase");
      if (input.gameId !== null) {
        const row = await games.findById(input.gameId);
        if (!row) throw AppError.notFound("Game");
        // Shown to everyone, as a nominee is.
        if (row.has_sexual_content) {
          throw AppError.validation("An adult game can't be a reveal");
        }
      }
      const existing = await repo.reveals([eventId]);
      await repo.insertReveal({
        event_id: eventId,
        game_id: input.gameId,
        label: input.label,
        tag: input.tag,
        position: existing.reduce(
          (max, row) => Math.max(max, row.position + 1),
          0,
        ),
      });
      return eventId;
    },

    async deleteReveal(id: number): Promise<number> {
      const reveal = await revealOf(id);
      await repo.deleteReveal(id);
      return reveal.event_id;
    },

    async reorderReveals(eventId: number, ids: number[]): Promise<number> {
      const existing = await repo.reveals([eventId]);
      const own = new Set(existing.map((r) => r.id));
      if (ids.length !== own.size || ids.some((id) => !own.has(id))) {
        throw AppError.validation("Give every reveal in the showcase once");
      }
      for (const [position, id] of ids.entries()) {
        await repo.setRevealPosition(id, position);
      }
      return eventId;
    },
  };
};

export type ShowcaseService = ReturnType<typeof createShowcaseService>;
