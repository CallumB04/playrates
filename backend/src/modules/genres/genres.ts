import { Router } from "express";
import type { Genre } from "@playrates/shared";
import type { Db } from "../../config/supabase.js";
import type { GenreRow } from "../../types/database.types.js";

export interface GenresRepository {
  list(): Promise<GenreRow[]>;
}

export const createGenresRepository = (db: Db): GenresRepository => ({
  async list() {
    const { data, error } = await db.from("genres").select("*").order("name");
    if (error) throw error;
    return (data ?? []) as GenreRow[];
  },
});

const toGenre = (row: GenreRow): Genre => ({
  slug: row.slug,
  name: row.name,
});

/* The API exposes genres as slugs on a game, so a filter needs somewhere to
   read display names from. Seeded rather than discovered, but not a closed set
   — the importer inserts genres RAWG returns that we have not seen, which is
   why this is an endpoint rather than a constant in the frontend. */
export const createGenresRouter = (repo: GenresRepository): Router => {
  const router = Router();

  router.get("/", async (_req, res) => {
    const rows = await repo.list();
    res.json({ data: rows.map(toGenre) });
  });

  return router;
};
