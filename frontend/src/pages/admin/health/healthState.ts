import type { AdminHealth } from "@playrates/shared";

export type SystemState = "up" | "slow" | "down";

/** Past this, a ping that should take tens of milliseconds is worth a look. */
const SLOW_DATABASE_MS = 800;

/** Each system's state, judged the same way everywhere it is shown. */
export const systemStates = (h: AdminHealth) => {
    const rawgFailingNow =
        h.rawg.lastFailureAt !== null &&
        (h.rawg.lastRequestAt === null || h.rawg.lastFailureAt >= h.rawg.lastRequestAt);

    const database: SystemState = !h.database.ok
        ? "down"
        : (h.database.latencyMs ?? 0) > SLOW_DATABASE_MS
          ? "slow"
          : "up";
    const rawg: SystemState = !h.rawg.configured ? "down" : rawgFailingNow ? "slow" : "up";
    const errors: SystemState =
        h.errors.last24h === 0 ? "up" : h.errors.last24h < 10 ? "slow" : "down";

    return { api: "up" as SystemState, database, rawg, errors };
};

/** The one sentence the page leads with: all well, or the worst of it. */
export const headline = (
    states: ReturnType<typeof systemStates>
): { text: string; state: SystemState } => {
    if (states.database === "down") return { text: "The database isn’t answering.", state: "down" };
    if (states.errors === "down") return { text: "The API is failing requests.", state: "down" };
    if (states.rawg === "down") return { text: "RAWG isn’t set up, so no new games can arrive.", state: "down" };
    if (states.rawg === "slow") return { text: "RAWG is failing, so search is using the catalogue alone.", state: "slow" };
    if (states.database === "slow") return { text: "The database is slow to answer.", state: "slow" };
    if (states.errors === "slow") return { text: "Everything is answering, with a few errors today.", state: "slow" };
    return { text: "Everything is answering.", state: "up" };
};
