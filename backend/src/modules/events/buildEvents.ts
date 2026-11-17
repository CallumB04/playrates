import type { Repositories } from "../../repositories.js";
import { createAwardsService } from "./awards/awards.service.js";
import { createShowcaseService } from "./showcase/showcase.service.js";
import { createEventsService } from "./events.service.js";

/** Events with every kind's part plugged in: one place to add a kind. */
export const buildEvents = (
  repos: Pick<
    Repositories,
    "events" | "awards" | "showcase" | "games" | "progress" | "friends"
  >,
) => {
  const awards = createAwardsService({
    repo: repos.awards,
    events: repos.events,
    games: repos.games,
    people: {
      byIds: (ids) => repos.progress.profilesByIds(ids),
      friendIds: async (userId) =>
        (await repos.friends.listForUser(userId))
          .filter((f) => f.status === "accepted")
          .map((f) => (f.user_a_id === userId ? f.user_b_id : f.user_a_id)),
    },
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
