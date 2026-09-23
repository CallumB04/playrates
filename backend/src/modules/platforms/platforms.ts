import { Router } from "express";
import type { Platform, PlatformSystem } from "@playrates/shared";
import type { Db } from "../../config/supabase.js";
import type {
  PlatformRow,
  PlatformSystemRow,
} from "../../types/database.types.js";

export interface PlatformsRepository {
  list(): Promise<PlatformRow[]>;
  listSystems(): Promise<PlatformSystemRow[]>;
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

  async listSystems() {
    const { data, error } = await db
      .from("platform_systems")
      .select("*")
      // sort_order carries the family's own order folded into it, so this is
      // already grouped by family.
      .order("sort_order");
    if (error) throw error;
    return (data ?? []) as PlatformSystemRow[];
  },
});

const toPlatform = (row: PlatformRow): Platform => ({
  slug: row.slug,
  displayName: row.display_name,
  sortOrder: row.sort_order,
});

const toSystem = (row: PlatformSystemRow): PlatformSystem => ({
  slug: row.slug,
  displayName: row.display_name,
  platformSlug: row.platform_slug,
  sortOrder: row.sort_order,
});

export const createPlatformsRouter = (repo: PlatformsRepository): Router => {
  const router = Router();

  router.get("/systems", async (_req, res) => {
    const rows = await repo.listSystems();
    res.json({ data: rows.map(toSystem) });
  });

  router.get("/", async (_req, res) => {
    const rows = await repo.list();
    res.json({ data: rows.map(toPlatform) });
  });

  return router;
};
