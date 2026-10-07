import type { Review } from "@playrates/shared";
import type { ReviewRow } from "../../types/database.types.js";

export const toReview = (row: ReviewRow): Review => ({
  id: row.id,
  gameId: row.game_id,
  logId: row.log_id,
  body: row.body,
  isPublic: row.is_public,
  containsSpoilers: row.contains_spoilers ?? false,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});
