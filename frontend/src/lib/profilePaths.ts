import type { ProfileView } from "@playrates/shared";
import type { GameStatus } from "../constants/gameStatus";

export const profilePath = (username: string, view?: ProfileView) =>
    view ? `/user/${username}/${view}` : `/user/${username}`;

/** One of someone's four shelves, on their games view. */
export const shelfPath = (username: string, status: GameStatus) =>
    `${profilePath(username, "games")}?type=${status}`;

/** Their reviews or their threads, on their posts view. */
export const postsPath = (username: string, kind: "reviews" | "threads") =>
    `${profilePath(username, "posts")}?type=${kind}`;
