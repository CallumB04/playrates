import * as Lucide from "lucide-react";
import { releaseParts } from "../dates.mjs";
import { developer, icon } from "../slides.mjs";
import { renderVersus } from "./versus.mjs";

const { History, Equal } = Lucide;

/**
 * Which came out first: two games, then each card's year spins up and the
 * date lands under it. The details line shows the developer, not the year,
 * which would be the answer. Release dates are the games table's, the
 * first release anywhere.
 */
export const renderWhichFirst = (post) => {
  for (const { a, b } of post.rounds) {
    for (const { game, slug } of [a, b]) {
      if (!releaseParts(game.date ?? "").exact)
        throw new Error(`${slug} has no exact release date`);
    }
  }
  return renderVersus(post, "hl", {
    question: "Which came out first?",
    value: (game) => Date.parse(game.date),
    best: "low",
    figure: (game) => {
      const { day, month, year } = releaseParts(game.date);
      // Spun up from a dozen years before, so the count lands rather than
      // flicking a digit.
      return { from: Number(year) - 12, to: Number(year), sub: `${day} ${month}` };
    },
    meta: (game) => developer(game) || "",
    win: `${icon(History, 2.5)}First`,
    tie: `${icon(Equal, 2.75)}Same day`,
  });
};
