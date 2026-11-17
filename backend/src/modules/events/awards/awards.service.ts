import {
  AVATAR_MAX_BYTES,
  AVATAR_PIXELS,
  AWARD_BOARD_PEOPLE,
  AWARD_BOARD_TIERS,
  awardsPhase,
  canSeeProfile,
  type AwardBoardPerson,
  type AwardLeaderboard,
  type AdminCategoryInput,
  type AdminNomineeInput,
  type AwardCategory,
  type AwardPicks,
} from "@playrates/shared";
import { AppError } from "../../../lib/AppError.js";
import { cleanUpload } from "../../../lib/cleanUpload.js";
import type { EventImageStore } from "../../../config/eventImageStore.js";
import type { GamesRepository } from "../../games/games.repository.js";
import { toGame } from "../../games/games.mapper.js";
import {
  toAccent,
  toProfileVisibility,
} from "../../profiles/profiles.mapper.js";
import type { ProfileRow } from "../../../types/database.types.js";
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
  events: Pick<EventsRepository, "findBySlug" | "findById" | "findByIds">;
  games: Pick<GamesRepository, "findByIds" | "findById">;
  /** Where pictures of nominees that aren't games go. */
  images?: EventImageStore;
  /** Who's on a leaderboard, and whose profiles a viewer may see. */
  people: {
    byIds(ids: string[]): Promise<ProfileRow[]>;
    friendIds(userId: string): Promise<string[]>;
  };
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
  images,
  people,
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

    /**
     * How the picks did, once any winner is in: the top scores, each with
     * how many reached it and a few of them by name, and where you stand.
     * A tie is one line. Those whose profiles you can't see are counted but
     * not named, as on the site's board.
     */
    async leaderboard(
      slug: string,
      viewerId: string | undefined,
    ): Promise<AwardLeaderboard> {
      const { event } = await publishedShow(slug);
      const categories = await repo.listCategories([event.id]);
      const nominees = await repo.listNominees(categories.map((c) => c.id));
      const decided = new Set(
        nominees.filter((n) => n.won).map((n) => n.category_id),
      ).size;
      const board: AwardLeaderboard = {
        tiers: [],
        total: 0,
        decided,
        categories: categories.length,
        you: null,
      };
      if (decided === 0) return board;

      const [rows, standing] = await Promise.all([
        repo.leaderboard(event.id, AWARD_BOARD_TIERS, AWARD_BOARD_PEOPLE),
        viewerId ? repo.standing(event.id, viewerId) : Promise.resolve(null),
      ]);
      const ids = rows.flatMap((r) => (r.user_id ? [r.user_id] : []));
      const [profiles, friends] = await Promise.all([
        people.byIds(ids),
        viewerId ? people.friendIds(viewerId) : Promise.resolve([]),
      ]);
      const byId = new Map(profiles.map((p) => [p.id, p]));
      const friendIds = new Set(friends);
      const person = (id: string): AwardBoardPerson | null => {
        const p = byId.get(id);
        if (!p) return null;
        const isYou = p.id === viewerId;
        const seen = canSeeProfile(toProfileVisibility(p.profile_visibility), {
          isOwner: isYou,
          isFriend: friendIds.has(p.id),
        });
        return seen
          ? {
              username: p.username,
              avatarUrl: p.avatar_url,
              accent: toAccent(p.accent),
              isYou,
            }
          : { hidden: true };
      };
      for (const row of rows) {
        let tier = board.tiers.find((t) => t.called === row.called);
        if (!tier) {
          tier = { called: row.called, players: row.players, people: [] };
          board.tiers.push(tier);
        }
        const someone = row.user_id ? person(row.user_id) : null;
        if (someone) tier.people.push(someone);
      }
      board.total = rows[0]?.voters ?? 0;
      board.you = standing
        ? { called: standing.called, rank: standing.rank }
        : null;
      return board;
    },

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
      return picksOf(userId, slug);
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

    /** A picture for a nominee that isn't a game, cleaned and stored as
     *  WebP as a profile picture is. A game shows its own cover. */
    async setNomineeImage(id: number, bytes: Buffer): Promise<number> {
      const nominee = await nomineeOf(id);
      if (nominee.game_id !== null) {
        throw AppError.validation("A game shows its own cover");
      }
      if (!images) throw new Error("No store for event pictures");
      if (bytes.length === 0) {
        throw AppError.badRequest("No image was uploaded");
      }
      if (bytes.length > AVATAR_MAX_BYTES) {
        throw AppError.badRequest("That picture is too large");
      }
      const clean = await cleanUpload(bytes, {
        maxEdge: AVATAR_PIXELS,
        maxBytes: AVATAR_MAX_BYTES,
      });
      await repo.updateNominee(id, { image_url: await images.put(id, clean) });
      return (await categoryOf(nominee.category_id)).event_id;
    },

    async clearNomineeImage(id: number): Promise<number> {
      const nominee = await nomineeOf(id);
      // Only an uploaded one is ours to delete; a game's cover set by hand
      // lives at IGDB.
      if (images && nominee.image_url?.includes("/event-images/")) {
        await images.remove(id);
      }
      await repo.updateNominee(id, { image_url: null });
      return (await categoryOf(nominee.category_id)).event_id;
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
      return show.event_id;
    },
  };
};

export type AwardsService = ReturnType<typeof createAwardsService>;
