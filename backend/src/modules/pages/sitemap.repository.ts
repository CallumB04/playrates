import type { Db } from "../../config/supabase.js";
import { allPages } from "../../lib/allPages.js";

export interface SitemapEntry {
  id: number;
  /** YYYY-MM-DD. */
  lastmod: string;
}

export interface SitemapRepository {
  /** Games a sitemap may list: everything but the adult ones. */
  countGames(): Promise<number>;
  games(offset: number, limit: number): Promise<SitemapEntry[]>;
  threads(): Promise<SitemapEntry[]>;
  /** Paths of what members made public: their profiles, lists and Gaming
   *  25s, each only where anyone may see it and they haven't asked to stay
   *  out of search. */
  people(): Promise<{ path: string; lastmod: string }[]>;
}

type Listed = { path: string; lastmod: string };
const day = (at: string) => at.slice(0, 10);

export const createSitemapRepository = (db: Db): SitemapRepository => ({
  async countGames() {
    const { count, error } = await db
      .from("games")
      .select("id", { count: "exact", head: true })
      .eq("has_sexual_content", false);
    if (error) throw error;
    return count ?? 0;
  },

  async games(offset, limit) {
    const { data, error } = await db.rpc("sitemap_games", {
      p_offset: offset,
      p_limit: limit,
    });
    if (error) throw error;
    return ((data ?? []) as [number, string][]).map(([id, lastmod]) => ({
      id,
      lastmod,
    }));
  },

  async threads() {
    const rows: SitemapEntry[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await db
        .from("community_thread_cards")
        .select("id, last_activity_at")
        // Threads about an adult game ask not to be listed, as its page does.
        .eq("game_has_sexual_content", false)
        .order("id")
        .range(from, from + 999);
      if (error) throw error;
      for (const row of (data ?? []) as {
        id: number;
        last_activity_at: string;
      }[]) {
        rows.push({ id: row.id, lastmod: row.last_activity_at.slice(0, 10) });
      }
      if (!data || data.length < 1000) return rows;
    }
  },

  async people() {
    /* Who is public and listed first; their lists and grids are then kept
       to them. (The views don't embed cleanly, so it's done here.) */
    const profiles = await allPages(async (from, to) => {
      const { data, error } = await db
        .from("profiles")
        .select("id, username, updated_at")
        .eq("profile_visibility", "everyone")
        .eq("hide_from_search", false)
        .order("id")
        .range(from, to);
      if (error) throw error;
      return (data ?? []) as {
        id: string;
        username: string;
        updated_at: string;
      }[];
    });
    const listed = new Map(profiles.map((p) => [p.id, p.username]));

    const [lists, grids] = await Promise.all([
      allPages(async (from, to) => {
        const { data, error } = await db
          .from("game_list_cards")
          .select("id, user_id, updated_at")
          .eq("visibility", "everyone")
          .eq("owner_visibility", "everyone")
          .order("id")
          .range(from, to);
        if (error) throw error;
        return (data ?? []) as {
          id: number;
          user_id: string;
          updated_at: string;
        }[];
      }),
      allPages(async (from, to) => {
        const { data, error } = await db
          .from("gaming_25_cards")
          .select("user_id, updated_at")
          .order("user_id")
          .range(from, to);
        if (error) throw error;
        return (data ?? []) as { user_id: string; updated_at: string }[];
      }),
    ]);

    const entries: Listed[] = profiles.map((p) => ({
      path: `/user/${p.username}`,
      lastmod: day(p.updated_at),
    }));
    for (const l of lists) {
      const owner = listed.get(l.user_id);
      if (owner) {
        entries.push({
          path: `/user/${owner}/lists/${l.id}`,
          lastmod: day(l.updated_at),
        });
      }
    }
    for (const g of grids) {
      const owner = listed.get(g.user_id);
      if (owner) {
        entries.push({
          path: `/user/${owner}/gaming-25`,
          lastmod: day(g.updated_at),
        });
      }
    }
    return entries;
  },
});
