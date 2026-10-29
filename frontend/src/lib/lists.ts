import {
    MAX_LIST_COVERS,
    type GameListEntry,
    type ListCover,
} from "@playrates/shared";

/** The covers a pick of these games would show: the picks, then the first
 *  games added to fill the places left, in the order they went in, so
 *  reordering a list leaves its picture alone. As the server works it out. */
export const coversFor = (
    picked: number[],
    games: GameListEntry[]
): ListCover[] => {
    const byAdded = [...games].sort(
        (a, b) => a.addedAt.localeCompare(b.addedAt) || a.rank - b.rank
    );
    const ids = [
        ...picked,
        ...byAdded.map((e) => e.game.id).filter((id) => !picked.includes(id)),
    ].slice(0, MAX_LIST_COVERS);
    const byId = new Map(games.map((e) => [e.game.id, e.game]));
    return ids.flatMap((id) => {
        const game = byId.get(id);
        return game ? [{ id, title: game.title, coverUrl: game.coverUrl }] : [];
    });
};
