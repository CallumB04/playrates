import type { Db } from "../../config/supabase.js";

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
}

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
        .from("community_threads")
        .select("id, last_activity_at")
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
});
