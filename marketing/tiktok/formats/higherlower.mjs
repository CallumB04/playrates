import * as Lucide from "lucide-react";
import { icon, year } from "../slides.mjs";
import { renderVersus } from "./versus.mjs";

const { ArrowUp, Equal } = Lucide;

/** Bands from frontend/src/lib/criticVerdict.ts, as on the game slides. */
const tone = (score) =>
  score >= 75
    ? "var(--critic-good)"
    : score >= 50
      ? "var(--critic-mixed)"
      : "var(--critic-poor)";

/**
 * Which got the higher critic score. Rounds get closer as they go. The
 * scores are the games table's, IGDB's critic aggregate, as the site's game
 * pages show them.
 */
export const renderHigherLower = (post) => {
  for (const { a, b } of post.rounds) {
    if (a.game.criticScore === null || b.game.criticScore === null)
      throw new Error(`${a.slug} or ${b.slug} has no critic score`);
  }
  return renderVersus(post, "hl", {
    question: "Which scored higher with critics?",
    value: (game) => game.criticScore,
    best: "high",
    figure: (game) => ({
      from: 0,
      to: game.criticScore,
      tone: tone(game.criticScore),
    }),
    meta: year,
    win: `${icon(ArrowUp, 2.75)}Higher`,
    tie: `${icon(Equal, 2.75)}Same score`,
  });
};
