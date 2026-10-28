import {
  GAMING_25_CATEGORIES,
  type Gaming25Category,
  type Gaming25Owner,
} from "@playrates/shared";
import { toAccent } from "../profiles/profiles.mapper.js";
import type { Gaming25PickRow } from "./gaming25.repository.js";

const ORDER = new Map<string, number>(
  GAMING_25_CATEGORIES.map((c, i) => [c.key, i]),
);

/** The picks in grid order. A category since retired keeps its row in the
 *  database but has no cell to show it in. */
export const inGridOrder = (
  rows: Gaming25PickRow[],
): { category: Gaming25Category; gameId: number }[] =>
  rows
    .filter((row) => ORDER.has(row.category))
    .sort((a, b) => ORDER.get(a.category)! - ORDER.get(b.category)!)
    .map((row) => ({
      category: row.category as Gaming25Category,
      gameId: row.game_id,
    }));

export const toGaming25Owner = (row: {
  username: string;
  avatar_url: string | null;
  accent: string | null;
  card_theme?: string | null;
}): Gaming25Owner => ({
  username: row.username,
  avatarUrl: row.avatar_url,
  accent: toAccent(row.accent),
  cardTheme: row.card_theme ?? "default",
});
