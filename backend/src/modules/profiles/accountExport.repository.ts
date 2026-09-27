import type { Db } from "../../config/supabase.js";

/** Every row PlayRates keeps that belongs to one person, by table. Raw
 *  rows rather than the API's shapes: the point is that nothing is left out,
 *  not that it reads nicely. */
export interface AccountData {
  profile: Record<string, unknown> | null;
  gameLogs: unknown[];
  reviews: unknown[];
  reviewVotes: unknown[];
  friendships: unknown[];
  notifications: unknown[];
  communityThreads: unknown[];
  communityMessages: unknown[];
  communityVotes: unknown[];
  activeDays: unknown[];
}

export interface AccountExportRepository {
  collect(userId: string): Promise<AccountData>;
}

// PostgREST stops at 1000 rows a request; a long-time user can pass that.
const PAGE = 1000;

/** The little of the query builder this needs. Its own generics are keyed to
 *  a schema this codebase does not generate. */
interface Query {
  eq(column: string, value: string): Query;
  or(filters: string): Query;
  order(column: string): Query;
  range(
    from: number,
    to: number,
  ): PromiseLike<{ data: unknown[] | null; error: unknown }>;
}

export const createAccountExportRepository = (
  db: Db,
): AccountExportRepository => {
  /** Pages need a stable order, or a row can land on two of them or none. */
  const everything = async (
    table: string,
    orderBy: string,
    filter: (q: Query) => Query,
  ): Promise<unknown[]> => {
    const rows: unknown[] = [];
    for (let from = 0; ; from += PAGE) {
      const query = filter(
        db.from(table).select("*") as unknown as Query,
      ).order(orderBy);
      const { data, error } = await query.range(from, from + PAGE - 1);
      if (error) throw error;
      rows.push(...(data ?? []));
      if (!data || data.length < PAGE) return rows;
    }
  };

  return {
    async collect(userId) {
      const own = (column: string) => (q: Query) => q.eq(column, userId);

      const [
        profiles,
        gameLogs,
        reviews,
        reviewVotes,
        friendships,
        notifications,
        communityThreads,
        communityMessages,
        communityVotes,
        activeDays,
      ] = await Promise.all([
        everything("profiles", "id", own("id")),
        everything("game_logs", "id", own("user_id")),
        everything("reviews", "id", own("user_id")),
        everything("review_votes", "review_id", own("user_id")),
        everything("friendships", "created_at", (q) =>
          q.or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`),
        ),
        everything("notifications", "id", own("user_id")),
        everything("community_threads", "id", own("author_id")),
        everything("community_messages", "id", own("author_id")),
        everything("community_message_votes", "message_id", own("user_id")),
        everything("user_active_days", "day", own("user_id")),
      ]);

      return {
        profile: (profiles[0] as Record<string, unknown> | undefined) ?? null,
        gameLogs,
        reviews,
        reviewVotes,
        friendships,
        notifications,
        communityThreads,
        communityMessages,
        communityVotes,
        activeDays,
      };
    },
  };
};
