import {
  awardsPhase,
  type AdminCategoryInput,
  type AdminNomineeInput,
  type AwardCategory,
  type AwardPicks,
} from "@playrates/shared";
import { AppError } from "../../../lib/AppError.js";
import type { GamesRepository } from "../../games/games.repository.js";
import { toGame } from "../../games/games.mapper.js";
import type { EventRow, EventsRepository } from "../events.repository.js";
import type { EventKindPart, KindCard, KindGameEntry } from "../kinds.js";
import type {
  AwardCategoryRow,
  AwardNomineeRow,
  AwardShowRow,
  AwardsRepository,
} from "./awards.repository.js";
import { awardsArt, toAwardsSummary, toCategory } from "./awards.mapper.js";

interface Deps {
  repo: AwardsRepository;
  events: Pick<
    EventsRepository,
    "findBySlug" | "findById" | "findByIds" | "grantBadge" | "revokeBadge"
  >;
  games: Pick<GamesRepository, "findByIds" | "findById">;
  now?: () => Date;
}

const phaseOf = (show: AwardShowRow, at: Date) =>
  awardsPhase(
    { picksCloseAt: show.picks_close_at, resultsAt: show.results_at },
    at,
  );

/**
 * Awards nights: the kind's part of an event (categories, nominees and the
 * crowd's picks), each member's own picks, and the admin's editing. Edits
 * answer with the event's id, for the events service to read back whole.
 */
export const createAwardsService = ({
  repo,
  events,
  games,
  now = () => new Date(),
}: Deps) => {
  /** Each night's categories with their nominees and games filled in. */
  const categoriesOf = async (
    eventIds: number[],
    withCounts: boolean,
  ): Promise<Map<number, AwardCategory[]>> => {
    const categories = await repo.listCategories(eventIds);
    const nominees = await repo.listNominees(categories.map((c) => c.id));
    const gameIds = [
      ...new Set(nominees.flatMap((n) => (n.game_id ? [n.game_id] : []))),
    ];
    const gameRows = gameIds.length > 0 ? await games.findByIds(gameIds) : [];
    const gamesById = new Map(gameRows.map((row) => [row.id, toGame(row)]));
    const counts = new Map<number, number>();
    if (withCounts) {
      for (const id of eventIds) {
        for (const row of await repo.pickCounts(id)) {
          counts.set(row.nominee_id, row.picks);
        }
      }
    }
    return new Map(
      eventIds.map((id) => [
        id,
        categories
          .filter((c) => c.event_id === id)
          .map((c) =>
            toCategory(
              c,
              nominees.filter((n) => n.category_id === c.id),
              gamesById,
              counts,
            ),
          ),
      ]),
    );
  };

  const showOf = async (eventId: number): Promise<AwardShowRow> => {
    const [show] = await repo.shows([eventId]);
    if (!show) throw AppError.notFound("Awards night");
    return show;
  };

  const categoryOf = async (id: number): Promise<AwardCategoryRow> => {
    const row = await repo.findCategory(id);
    if (!row) throw AppError.notFound("Category");
    return row;
  };

  const nomineeOf = async (id: number): Promise<AwardNomineeRow> => {
    const row = await repo.findNominee(id);
    if (!row) throw AppError.notFound("Nominee");
    return row;
  };

  /** A visitor sees published nights only; a draft is as good as absent. */
  const publishedShow = async (
    slug: string,
  ): Promise<{ event: EventRow; show: AwardShowRow }> => {
    const event = await events.findBySlug(slug);
    if (!event?.published_at) throw AppError.notFound("Event");
    return { event, show: await showOf(event.id) };
  };

  /** Nominees are shown to everyone, so a game hidden from some is refused
   *  outright, as a list refuses one. */
  const checkGame = async (gameId: number) => {
    const row = await games.findById(gameId);
    if (!row) throw AppError.notFound("Game");
    if (row.has_sexual_content) {
      throw AppError.validation("An adult game can't be a nominee");
    }
  };

  const nextPosition = (rows: { position: number }[]) =>
    rows.reduce((max, row) => Math.max(max, row.position + 1), 0);

  const picksOf = async (userId: string, slug: string): Promise<AwardPicks> => {
    const { event } = await publishedShow(slug);
    const categories = await repo.listCategories([event.id]);
    const rows = await repo.picks(
      userId,
      categories.map((c) => c.id),
    );
    return Object.fromEntries(
      rows.map((row) => [row.category_id, row.nominee_id]),
    );
  };

  const part: EventKindPart = {
    async cards(rows, at) {
      const ids = rows.map((e) => e.id);
      const [shows, categories] = await Promise.all([
        repo.shows(ids),
        categoriesOf(ids, false),
      ]);
      const cards = new Map<number, KindCard>();
      for (const show of shows) {
        const own = categories.get(show.event_id) ?? [];
        cards.set(show.event_id, {
          ...awardsArt(own),
          awards: toAwardsSummary(show, own, at),
          showcase: null,
        });
      }
      return cards;
    },

    async detail(event, at) {
      const [shows, categories] = await Promise.all([
        repo.shows([event.id]),
        categoriesOf([event.id], true),
      ]);
      const own = categories.get(event.id) ?? [];
      return {
        ...awardsArt(own),
        awards: shows[0]
          ? { ...toAwardsSummary(shows[0], own, at), categories: own }
          : null,
        showcase: null,
      };
    },

    async forGame(gameId, at) {
      const nominees = await repo.nomineesForGame(gameId);
      const entries = new Map<number, KindGameEntry>();
      if (nominees.length === 0) return entries;
      const categories = await repo.findCategories(
        nominees.map((n) => n.category_id),
      );
      const shows = await repo.shows([
        ...new Set(categories.map((c) => c.event_id)),
      ]);
      for (const show of shows) {
        const phase = phaseOf(show, at);
        const own = categories
          .filter((c) => c.event_id === show.event_id)
          .sort(
            (a, b) =>
              Number(b.headline) - Number(a.headline) ||
              a.position - b.position,
          );
        entries.set(show.event_id, {
          awards: {
            phase,
            nominations: own.map((category) => ({
              category: category.name,
              headline: category.headline,
              // Marked winners stay private until the results are out.
              won:
                phase === "results" &&
                nominees.some((n) => n.category_id === category.id && n.won),
            })),
          },
          showcase: null,
        });
      }
      return entries;
    },

    async save(eventId, input) {
      const [existing] = await repo.shows([eventId]);
      await repo.saveShow({
        event_id: eventId,
        picks_close_at: input.awards!.picksCloseAt,
        results_at: existing?.results_at ?? null,
      });
    },
  };

  return {
    part,

    picksOf,

    async pick(
      userId: string,
      slug: string,
      categoryId: number,
      nomineeId: number | null,
    ): Promise<AwardPicks> {
      const { event, show } = await publishedShow(slug);
      const category = await repo.findCategory(categoryId);
      if (!category || category.event_id !== event.id) {
        throw AppError.notFound("Category");
      }
      if (phaseOf(show, now()) !== "open") {
        throw AppError.badRequest("Picks have closed");
      }
      if (nomineeId === null) {
        await repo.clearPick(userId, categoryId);
      } else {
        const nominee = await repo.findNominee(nomineeId);
        if (!nominee || nominee.category_id !== categoryId) {
          throw AppError.notFound("Nominee");
        }
        await repo.setPick(userId, categoryId, nomineeId);
      }
      // A full ballot is earned with the last pick and lost with any taken
      // back, while picks are open; it stands as it was when they close.
      const categories = await repo.listCategories([event.id]);
      const withNominees = new Set(
        (await repo.listNominees(categories.map((c) => c.id))).map(
          (n) => n.category_id,
        ),
      );
      const picks = await picksOf(userId, slug);
      const full = [...withNominees].every((id) => picks[id] !== undefined);
      await (full
        ? events.grantBadge(userId, event.id, "full-ballot")
        : events.revokeBadge(userId, event.id, "full-ballot"));
      return picks;
    },

    /* ------------------------------------------------------------ admin */

    async addCategory(
      eventId: number,
      input: AdminCategoryInput,
    ): Promise<number> {
      await showOf(eventId);
      const existing = await repo.listCategories([eventId]);
      await repo.insertCategory({
        event_id: eventId,
        slug: input.slug,
        name: input.name,
        blurb: input.blurb,
        section: input.section,
        headline: input.headline,
        position: nextPosition(existing),
      });
      return eventId;
    },

    async updateCategory(
      id: number,
      input: AdminCategoryInput,
    ): Promise<number> {
      const category = await categoryOf(id);
      await repo.updateCategory(id, {
        slug: input.slug,
        name: input.name,
        blurb: input.blurb,
        section: input.section,
        headline: input.headline,
      });
      return category.event_id;
    },

    async deleteCategory(id: number): Promise<number> {
      const category = await categoryOf(id);
      await repo.deleteCategory(id);
      return category.event_id;
    },

    async reorderCategories(eventId: number, ids: number[]): Promise<number> {
      const existing = await repo.listCategories([eventId]);
      const own = new Set(existing.map((c) => c.id));
      if (ids.length !== own.size || ids.some((id) => !own.has(id))) {
        throw AppError.validation("Give every category in the event once");
      }
      for (const [position, id] of ids.entries()) {
        await repo.updateCategory(id, { position });
      }
      return eventId;
    },

    async addNominee(
      categoryId: number,
      input: AdminNomineeInput,
    ): Promise<number> {
      const category = await categoryOf(categoryId);
      if (input.gameId !== null) await checkGame(input.gameId);
      const existing = await repo.listNominees([categoryId]);
      await repo.insertNominee({
        category_id: categoryId,
        game_id: input.gameId,
        label: input.label,
        detail: input.detail,
        position: nextPosition(existing),
      });
      return category.event_id;
    },

    async deleteNominee(id: number): Promise<number> {
      const nominee = await nomineeOf(id);
      const category = await categoryOf(nominee.category_id);
      await repo.deleteNominee(id);
      return category.event_id;
    },

    async reorderNominees(categoryId: number, ids: number[]): Promise<number> {
      const category = await categoryOf(categoryId);
      const existing = await repo.listNominees([categoryId]);
      const own = new Set(existing.map((n) => n.id));
      if (ids.length !== own.size || ids.some((id) => !own.has(id))) {
        throw AppError.validation("Give every nominee in the category once");
      }
      for (const [position, id] of ids.entries()) {
        await repo.updateNominee(id, { position });
      }
      return category.event_id;
    },

    /** One winner per category: marking one unmarks the rest. The results
     *  go out with the first winner, so they can be marked live through the
     *  night, and come back in with the last one cleared. */
    async setWinner(id: number, won: boolean): Promise<number> {
      const nominee = await nomineeOf(id);
      const category = await categoryOf(nominee.category_id);
      if (won) {
        for (const other of await repo.listNominees([category.id])) {
          if (other.won && other.id !== id) {
            await repo.updateNominee(other.id, { won: false });
          }
        }
      }
      await repo.updateNominee(id, { won });
      const show = await showOf(category.event_id);
      const categories = await repo.listCategories([show.event_id]);
      const anyWon = (
        await repo.listNominees(categories.map((c) => c.id))
      ).some((n) => n.won);
      if (anyWon !== (show.results_at !== null)) {
        await repo.saveShow({
          ...show,
          results_at: anyWon ? now().toISOString() : null,
        });
      }
      await repo.refreshResultBadges(show.event_id);
      return show.event_id;
    },
  };
};

export type AwardsService = ReturnType<typeof createAwardsService>;
