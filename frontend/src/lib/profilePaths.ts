import type { ProfileView } from "@playrates/shared";
import type { GameStatus } from "../constants/gameStatus";

export const profilePath = (username: string, view?: ProfileView) =>
    view ? `/user/${username}/${view}` : `/user/${username}`;

/** One of someone's four shelves, on their games view. */
export const shelfPath = (username: string, status: GameStatus) =>
    `${profilePath(username, "games")}?type=${status}`;

/** One list's own page, under its owner. */
export const listPath = (username: string, listId: number) =>
    `${profilePath(username, "lists")}/${listId}`;

/** Someone's Gaming 25, which lives under them but isn't a tab. */
export const gaming25Path = (username: string) =>
    `${profilePath(username)}/gaming-25`;
