import type { Db } from "../../../config/supabase.js";

export interface AwardShowRow {
  event_id: number;
  picks_close_at: string;
  results_at: string | null;
}

export interface AwardCategoryRow {
  id: number;
  event_id: number;
  slug: string;
  name: string;
  blurb: string;
  section: string;
  position: number;
  headline: boolean;
}

export interface AwardNomineeRow {
  id: number;
  category_id: number;
  game_id: number | null;
  label: string | null;
  detail: string | null;
  position: number;
  won: boolean;
}

export interface AwardPickRow {
  category_id: number;
  nominee_id: number;
}

/** A line of award_leaderboard: a score, how many reached it, and one of
 *  them (null for a score nobody is listed under). */
export interface AwardBoardRow {
  called: number;
  players: number;
  voters: number;
  user_id: string | null;
}

export interface AwardStandingRow {
  called: number;
  rank: number;
  voters: number;
}

export type NewCategory = Omit<AwardCategoryRow, "id">;
export type CategoryPatch = Partial<
  Pick<
    AwardCategoryRow,
    "slug" | "name" | "blurb" | "section" | "headline" | "position"
  >
>;

export type NewNominee = Omit<AwardNomineeRow, "id" | "won">;
export type NomineePatch = Partial<Pick<AwardNomineeRow, "won" | "position">>;

/** An awards night's own tables, beside the event it belongs to. */
export interface AwardsRepository {
  shows(eventIds: number[]): Promise<AwardShowRow[]>;
  /** Made with its event, and changed with it. */
  saveShow(show: AwardShowRow): Promise<void>;

  /** In their order within each event. */
  listCategories(eventIds: number[]): Promise<AwardCategoryRow[]>;
  findCategory(id: number): Promise<AwardCategoryRow | null>;
  findCategories(ids: number[]): Promise<AwardCategoryRow[]>;
  insertCategory(category: NewCategory): Promise<AwardCategoryRow>;
  updateCategory(
    id: number,
    patch: CategoryPatch,
  ): Promise<AwardCategoryRow | null>;
  deleteCategory(id: number): Promise<void>;

  /** In their order within each category. */
  listNominees(categoryIds: number[]): Promise<AwardNomineeRow[]>;
  findNominee(id: number): Promise<AwardNomineeRow | null>;
  insertNominee(nominee: NewNominee): Promise<AwardNomineeRow>;
  updateNominee(
    id: number,
    patch: NomineePatch,
  ): Promise<AwardNomineeRow | null>;
  deleteNominee(id: number): Promise<void>;
  /** Every nomination a game has, at any awards night. */
  nomineesForGame(gameId: number): Promise<AwardNomineeRow[]>;

  /** Picks per nominee across a night; a nominee nobody picked is absent. */
  pickCounts(eventId: number): Promise<{ nominee_id: number; picks: number }[]>;
  picks(userId: string, categoryIds: number[]): Promise<AwardPickRow[]>;
  /** A night's top scores, with a few of those who reached each. */
  leaderboard(
    eventId: number,
    tiers: number,
    perTier: number,
  ): Promise<AwardBoardRow[]>;
  /** One member's score and place; null without picks. */
  standing(eventId: number, userId: string): Promise<AwardStandingRow | null>;
  setPick(userId: string, categoryId: number, nomineeId: number): Promise<void>;
  clearPick(userId: string, categoryId: number): Promise<void>;
}

const CATEGORY = "id, event_id, slug, name, blurb, section, position, headline";
const NOMINEE = "id, category_id, game_id, label, detail, position, won";

export const createAwardsRepository = (db: Db): AwardsRepository => {
  const one = async <T>(
    query: PromiseLike<{ data: unknown; error: unknown }>,
  ): Promise<T | null> => {
    const { data, error } = await query;
    if (error) throw error;
    return (data as T | null) ?? null;
  };

  const many = async <T>(
    query: PromiseLike<{ data: unknown; error: unknown }>,
  ): Promise<T[]> => {
    const { data, error } = await query;
    if (error) throw error;
    return (data as T[] | null) ?? [];
  };

  return {
    shows(eventIds) {
      if (eventIds.length === 0) return Promise.resolve([]);
      return many(
        db
          .from("award_shows")
          .select("event_id, picks_close_at, results_at")
          .in("event_id", eventIds),
      );
    },

    async saveShow(show) {
      const { error } = await db
        .from("award_shows")
        .upsert(show, { onConflict: "event_id" });
      if (error) throw error;
    },

    listCategories(eventIds) {
      if (eventIds.length === 0) return Promise.resolve([]);
      return many(
        db
          .from("award_categories")
          .select(CATEGORY)
          .in("event_id", eventIds)
          .order("position")
          .order("id"),
      );
    },

    findCategory(id) {
      return one(
        db.from("award_categories").select(CATEGORY).eq("id", id).maybeSingle(),
      );
    },

    findCategories(ids) {
      if (ids.length === 0) return Promise.resolve([]);
      return many(db.from("award_categories").select(CATEGORY).in("id", ids));
    },

    async insertCategory(category) {
      return (await one<AwardCategoryRow>(
        db.from("award_categories").insert(category).select(CATEGORY).single(),
      ))!;
    },

    updateCategory(id, patch) {
      return one(
        db
          .from("award_categories")
          .update(patch)
          .eq("id", id)
          .select(CATEGORY)
          .maybeSingle(),
      );
    },

    async deleteCategory(id) {
      const { error } = await db.from("award_categories").delete().eq("id", id);
      if (error) throw error;
    },

    listNominees(categoryIds) {
      if (categoryIds.length === 0) return Promise.resolve([]);
      return many(
        db
          .from("award_nominees")
          .select(NOMINEE)
          .in("category_id", categoryIds)
          .order("position")
          .order("id"),
      );
    },

    findNominee(id) {
      return one(
        db.from("award_nominees").select(NOMINEE).eq("id", id).maybeSingle(),
      );
    },

    async insertNominee(nominee) {
      return (await one<AwardNomineeRow>(
        db.from("award_nominees").insert(nominee).select(NOMINEE).single(),
      ))!;
    },

    updateNominee(id, patch) {
      return one(
        db
          .from("award_nominees")
          .update(patch)
          .eq("id", id)
          .select(NOMINEE)
          .maybeSingle(),
      );
    },

    async deleteNominee(id) {
      const { error } = await db.from("award_nominees").delete().eq("id", id);
      if (error) throw error;
    },

    nomineesForGame(gameId) {
      return many(
        db.from("award_nominees").select(NOMINEE).eq("game_id", gameId),
      );
    },

    pickCounts(eventId) {
      return many(db.rpc("award_pick_counts", { p_event: eventId }));
    },

    leaderboard(eventId, tiers, perTier) {
      return many(
        db.rpc("award_leaderboard", {
          p_event: eventId,
          p_tiers: tiers,
          p_per_tier: perTier,
        }),
      );
    },

    async standing(eventId, userId) {
      const { data, error } = await db.rpc("award_standing", {
        p_event: eventId,
        p_user: userId,
      });
      if (error) throw error;
      return ((data ?? []) as AwardStandingRow[])[0] ?? null;
    },

    picks(userId, categoryIds) {
      if (categoryIds.length === 0) return Promise.resolve([]);
      return many(
        db
          .from("award_picks")
          .select("category_id, nominee_id")
          .eq("user_id", userId)
          .in("category_id", categoryIds),
      );
    },

    async setPick(userId, categoryId, nomineeId) {
      const { error } = await db.from("award_picks").upsert(
        {
          user_id: userId,
          category_id: categoryId,
          nominee_id: nomineeId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,category_id" },
      );
      if (error) throw error;
    },

    async clearPick(userId, categoryId) {
      const { error } = await db
        .from("award_picks")
        .delete()
        .eq("user_id", userId)
        .eq("category_id", categoryId);
      if (error) throw error;
    },
  };
};
