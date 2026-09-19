/**
 * Game covers now come from the API (sourced from RAWG) rather than local
 * files named after the game id. The old paths were hardcoded to the
 * "/PlayRates/" GitHub Pages prefix in seven separate components.
 */
export const gameCoverUrl = (coverUrl: string | null | undefined): string =>
    coverUrl ?? `${import.meta.env.BASE_URL}assets/game-cover-placeholder.svg`;

export const profilePictureUrl = (pictureUrl: string | null | undefined) =>
    pictureUrl ?? "";
