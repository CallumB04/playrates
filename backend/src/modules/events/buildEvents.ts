import type { Repositories } from "../../repositories.js";
import { createAwardsService } from "./awards/awards.service.js";
import { createShowcaseService } from "./showcase/showcase.service.js";
import { createEventsService } from "./events.service.js";

/** Events with every kind's part plugged in: one place to add a kind. */
export const buildEvents = (
  repos: Pick<Repositories, "events" | "awards" | "showcase" | "games">,
) => {
  const awards = createAwardsService({
    repo: repos.awards,
    events: repos.events,
    games: repos.games,
  });
  const showcase = createShowcaseService({
    repo: repos.showcase,
    events: repos.events,
    games: repos.games,
  });
  const events = createEventsService({
    repo: repos.events,
    kinds: { awards: awards.part, showcase: showcase.part },
  });
  return { events, awards, showcase };
};
