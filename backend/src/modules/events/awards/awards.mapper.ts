import {
  awardsPhase,
  type AwardCategory,
  type AwardsSummary,
  type Game,
} from "@playrates/shared";
import type {
  AwardCategoryRow,
  AwardNomineeRow,
  AwardShowRow,
} from "./awards.repository.js";

/** Nominees whose game has gone, or is hidden, drop out rather than show as
 *  a blank. */
export const toCategory = (
  row: AwardCategoryRow,
  nominees: AwardNomineeRow[],
  games: Map<number, Game>,
  counts: Map<number, number>,
): AwardCategory => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  blurb: row.blurb,
  section: row.section,
  headline: row.headline,
  nominees: nominees.flatMap((n) => {
    const game = n.game_id ? (games.get(n.game_id) ?? null) : null;
    if (n.game_id && (!game || game.hasSexualContent)) return [];
    return [
      {
        id: n.id,
        game,
        label: n.label,
        detail: n.detail,
        won: n.won,
        picks: counts.get(n.id) ?? 0,
      },
    ];
  }),
});

export const toAwardsSummary = (
  show: AwardShowRow,
  categories: AwardCategory[],
  at: Date,
): AwardsSummary => {
  const times = {
    picksCloseAt: show.picks_close_at,
    resultsAt: show.results_at,
  };
  return {
    ...times,
    phase: awardsPhase(times, at),
    categoryCount: categories.length,
    nomineeCount: categories.reduce((sum, c) => sum + c.nominees.length, 0),
  };
};

/** The headline award, or the first when none is marked. */
export const headlineOf = (
  categories: AwardCategory[],
): AwardCategory | undefined =>
  categories.find((c) => c.headline) ?? categories[0];

/** A night's card art: the headline award's games. */
export const awardsArt = (categories: AwardCategory[]) => {
  const games = (headlineOf(categories)?.nominees ?? []).flatMap((n) =>
    n.game ? [n.game] : [],
  );
  const artworks = games.flatMap((g) => (g.artworkUrl ? [g.artworkUrl] : []));
  return {
    covers: games.flatMap((g) => (g.coverUrl ? [g.coverUrl] : [])),
    artworkUrl: artworks[0] ?? null,
    artworks,
  };
};
