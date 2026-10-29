import type { ReactionState } from "@playrates/shared";
import {
  MAX_LIST_COVERS,
  type GameListSummary,
  type ListCover,
  type ProfileAccent,
} from "@playrates/shared";
import { toProfileVisibility } from "../profiles/profiles.mapper.js";
import type { ListCardRow } from "./lists.repository.js";

/**
 * The games a list's picture shows: the ones its owner picked, then its
 * first games to fill the places left, four at most. A pick that has left
 * the list since is passed over.
 */
export const listCovers = (
  picked: number[] | null,
  inList: number[],
): number[] => {
  const present = new Set(inList);
  const chosen = (picked ?? []).filter((id) => present.has(id));
  const rest = inList.filter((id) => !chosen.includes(id));
  return [...chosen, ...rest].slice(0, MAX_LIST_COVERS);
};

/** The cover ids a card needs, before their games are looked up. The
 *  service drops a pick as its game leaves the list, so the picks stand;
 *  its first four games are all it needs to fill with. */
export const cardCoverIds = (row: ListCardRow): number[] =>
  listCovers(row.cover_game_ids, [
    ...(row.cover_game_ids ?? []),
    ...row.first_game_ids,
  ]);

export const toListSummary = (
  row: ListCardRow,
  coverIds: number[],
  covers: Map<number, ListCover>,
  reactions: ReactionState,
): GameListSummary => ({
  id: row.id,
  name: row.name,
  description: row.description,
  visibility: toProfileVisibility(row.visibility),
  colour: row.colour as ProfileAccent | null,
  ranked: row.ranked,
  gameCount: row.game_count,
  ...reactions,
  covers: coverIds.flatMap((id) => covers.get(id) ?? []),
  owner: {
    username: row.owner_username,
    avatarUrl: row.owner_avatar_url,
    accent: row.owner_accent as ProfileAccent,
  },
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});
