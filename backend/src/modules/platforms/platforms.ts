import { Router } from "express";
import type { Platform } from "@playrates/shared";
import type { Db } from "../../config/supabase.js";
import type { PlatformRow } from "../../types/database.types.js";

export interface PlatformsRepository {
  list(): Promise<PlatformRow[]>;
}

export const createPlatformsRepository = (db: Db): PlatformsRepository => ({
  async list() {
    const { data, error } = await db
      .from("platforms")
      .select("*")
      .order("sort_order");
    if (error) throw error;
    return (data ?? []) as PlatformRow[];
  },
});

const toPlatform = (row: PlatformRow): Platform => ({
  slug: row.slug,
  displayName: row.display_name,
  iconClass: row.icon_class,
  sortOrder: row.sort_order,
});

export const createPlatformsRouter = (repo: PlatformsRepository): Router => {
  const router = Router();

  router.get("/", async (_req, res) => {
    const rows = await repo.list();
    res.json({ data: rows.map(toPlatform) });
  });

  return router;
};
