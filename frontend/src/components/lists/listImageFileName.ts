import type { GameListDetail } from "@playrates/shared";

/** The picture's file name: whose list and which, as a phone would show it. */
export const listImageFileName = (list: GameListDetail): string => {
    const slug = list.name
        .normalize("NFKD")
        .replace(/\p{M}/gu, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .slice(0, 48)
        .replace(/^-+|-+$/g, "");
    return `${list.owner.username}-${slug || `list-${list.id}`}.png`;
};
