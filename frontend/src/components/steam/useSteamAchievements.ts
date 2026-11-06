import { useCallback, useEffect, useRef, useState } from "react";
import {
    STEAM_ACHIEVEMENTS_BATCH,
    type SteamAchievements,
} from "@playrates/shared";
import { ApiError, fetchSteamAchievements } from "../../api";
import type { Achievements, AchievementState } from "./steamChoices";

/** Two batches in flight: quick enough, and well inside the rate limit. */
const AT_ONCE = 2;
/** After a 429, a pause before the batch goes again. */
const BACK_OFF_MS = 15_000;

export type BatchOutcome =
    | { kind: "found"; results: SteamAchievements[] }
    | { kind: "failed" }
    | { kind: "private" };

/** The states after one batch comes back. Private means the whole
 *  profile, so everything still waiting goes with it. */
export const settle = (
    states: Achievements,
    appids: number[],
    outcome: BatchOutcome
): Achievements => {
    const next = new Map(states);
    if (outcome.kind === "private") {
        for (const [appid, state] of next) {
            if (state.kind === "loading") next.set(appid, { kind: "private" });
        }
        return next;
    }
    if (outcome.kind === "failed") {
        for (const appid of appids) next.set(appid, { kind: "failed" });
        return next;
    }
    for (const { appid, achievements } of outcome.results) {
        next.set(appid, { kind: "done", value: achievements });
    }
    return next;
};

const waiting = (appids: number[]): Achievements =>
    new Map(appids.map((appid) => [appid, { kind: "loading" }]));

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Each game's achievements, asked of Steam a batch at a time once the
 * library is on screen, in the order it's shown. Every game starts as
 * loading and settles as its batch comes back; `retry` asks again for the
 * ones that failed.
 */
export const useSteamAchievements = (
    steamId: string | undefined,
    appids: number[],
    backOffMs = BACK_OFF_MS
) => {
    const [states, setStates] = useState<Achievements>(() => waiting(appids));
    const [round, setRound] = useState(0);
    const queued = useRef<number[]>(appids);
    const key = appids.join(",");

    useEffect(() => {
        if (!steamId || queued.current.length === 0) return;
        let cancelled = false;
        const queue = [...queued.current];
        queued.current = [];
        // Out but not back: a cleanup mid-request sends these again too.
        const inFlight = new Set<number[]>();

        const worker = async () => {
            while (!cancelled && queue.length > 0) {
                const batch = queue.splice(0, STEAM_ACHIEVEMENTS_BATCH);
                inFlight.add(batch);
                let outcome: BatchOutcome;
                for (;;) {
                    try {
                        outcome = {
                            kind: "found",
                            results: await fetchSteamAchievements(
                                steamId,
                                batch
                            ),
                        };
                    } catch (error) {
                        if (error instanceof ApiError && error.status === 429) {
                            await wait(backOffMs);
                            if (cancelled) return;
                            continue;
                        }
                        outcome =
                            error instanceof ApiError &&
                            error.code === "steam_private"
                                ? { kind: "private" }
                                : { kind: "failed" };
                    }
                    break;
                }
                if (cancelled) return;
                inFlight.delete(batch);
                setStates((current) => settle(current, batch, outcome));
                if (outcome.kind === "private") {
                    queue.length = 0;
                    return;
                }
            }
        };
        void Promise.all(Array.from({ length: AT_ONCE }, worker));
        return () => {
            cancelled = true;
            // Whatever hadn't come back is asked for again if this runs again.
            queued.current = [
                ...[...inFlight].flat(),
                ...queue,
                ...queued.current,
            ];
        };
        // A new library is a new list, and a retry is a new round.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [steamId, key, round]);

    const retry = useCallback(() => {
        const failed: number[] = [];
        setStates((current) => {
            const next = new Map(current);
            for (const [appid, state] of current) {
                if (state.kind === "failed") {
                    failed.push(appid);
                    next.set(appid, { kind: "loading" } as AchievementState);
                }
            }
            return next;
        });
        queued.current = failed;
        setRound((n) => n + 1);
    }, []);

    let settled = 0;
    let failed = 0;
    let privateToo = false;
    for (const state of states.values()) {
        if (state.kind !== "loading") settled += 1;
        if (state.kind === "failed") failed += 1;
        if (state.kind === "private") privateToo = true;
    }
    return {
        states,
        total: states.size,
        settled,
        failed,
        hidden: privateToo,
        retry,
    };
};
