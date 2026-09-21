/** Cover art comes from the API; this only supplies the fallback. */
export const gameCoverUrl = (coverUrl: string | null | undefined): string =>
    coverUrl ?? `${import.meta.env.BASE_URL}assets/game-cover-placeholder.svg`;

export const profilePictureUrl = (avatarUrl: string | null | undefined) =>
    avatarUrl ?? "";
