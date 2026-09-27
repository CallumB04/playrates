/**
 * The words a page gives search engines and link previews. Shared so the
 * page the server sends and the page the app then renders say the same
 * thing: a preview card and a tab that disagree look broken.
 *
 * Facts only. The site's own voice is in the homepage and the pitch; these
 * are the lines under a search result.
 */

export const SITE_NAME = "PlayRates";

/** The tab and result title with no page of its own. */
export const SITE_TITLE = `${SITE_NAME} / Video Game Tracker`;

/** The pitch, word for word. Kept in step with BRAND_PITCH in the frontend
 *  by a test there. */
export const SITE_DESCRIPTION =
  "Log, rate and review the games you’ve played, manage your backlog and wishlist, and interact with your friends and the community.";

/** Search engines show about this much before cutting a description off. */
export const DESCRIPTION_MAX = 155;

export const pageTitle = (page?: string | null): string =>
  page ? `${page} / ${SITE_NAME}` : SITE_TITLE;

/** Cut at a word, not mid-way through one, with an ellipsis if anything
 *  went. Whitespace is folded first: these come from prose with line breaks. */
export const truncateDescription = (
  text: string,
  max = DESCRIPTION_MAX,
): string => {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:!?-]+$/, "")}…`;
};

/** "A, B and C". */
const listOf = (items: string[]): string =>
  items.length <= 1
    ? (items[0] ?? "")
    : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

export interface GameMetaInput {
  title: string;
  releaseDate: string | null;
  /** Display names, e.g. "PlayStation", not slugs. */
  platforms: string[];
  avgRating: number | null;
  ratingCount: number;
}

const yearOf = (date: string | null): string | null =>
  date && /^\d{4}/.test(date) ? date.slice(0, 4) : null;

/** "Hades (2020)": the page's name, before the site's is added. */
export const gamePageName = ({
  title,
  releaseDate,
}: Pick<GameMetaInput, "title" | "releaseDate">): string => {
  const year = yearOf(releaseDate);
  return year ? `${title} (${year})` : title;
};

export const gameDescription = (game: GameMetaInput): string => {
  const year = yearOf(game.releaseDate);
  const platforms = game.platforms.slice(0, 4);
  const opening = `${game.title}${year ? ` (${year})` : ""}${
    platforms.length > 0 ? ` on ${listOf(platforms)}` : ""
  }.`;
  const rated =
    game.ratingCount > 0 && game.avgRating !== null
      ? ` Rated ${game.avgRating.toFixed(1)}/10 from ${game.ratingCount} ${
          game.ratingCount === 1 ? "rating" : "ratings"
        } on ${SITE_NAME}.`
      : ` Log, rate and review it on ${SITE_NAME}.`;
  return truncateDescription(opening + rated);
};

export const profileDescription = (username: string, bio: string): string =>
  bio.trim()
    ? truncateDescription(bio)
    : `${username}’s games on ${SITE_NAME}.`;
