import { describe, expect, it } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "../../test/msw/server";
import { settle, useSteamAchievements } from "./useSteamAchievements";
import type { Achievements } from "./steamChoices";

const API = "http://localhost:3000/api/v1";
const STEAM_ID = "76561198000000001";

const loading = (...appids: number[]): Achievements =>
    new Map(appids.map((appid) => [appid, { kind: "loading" }]));

describe("settling a batch", () => {
    it("records what each game has", () => {
        const next = settle(loading(1, 2), [1, 2], {
            kind: "found",
            results: [
                { appid: 1, achievements: { total: 10, unlocked: 3 } },
                { appid: 2, achievements: null },
            ],
        });
        expect([...next]).toEqual([
            [1, { kind: "done", value: { total: 10, unlocked: 3 } }],
            [2, { kind: "done", value: null }],
        ]);
    });

    it("marks only its own games failed", () => {
        const next = settle(loading(1, 2), [1], { kind: "failed" });
        expect(next.get(1)).toEqual({ kind: "failed" });
        expect(next.get(2)).toEqual({ kind: "loading" });
    });

    it("takes everything still waiting with it when the profile is private", () => {
        const states: Achievements = new Map([
            [1, { kind: "done", value: null }],
            [2, { kind: "loading" }],
            [3, { kind: "loading" }],
        ]);
        const next = settle(states, [2], { kind: "private" });
        expect([...next.values()].map((s) => s.kind)).toEqual([
            "done",
            "private",
            "private",
        ]);
    });
});

describe("useSteamAchievements", () => {
    const answering = (
        respond: (appids: number[]) => Response | Promise<Response>
    ) => {
        const asked: number[][] = [];
        server.use(
            http.post(`${API}/me/steam/achievements`, async ({ request }) => {
                const { appids } = (await request.json()) as {
                    appids: number[];
                };
                asked.push(appids);
                return respond(appids);
            })
        );
        return asked;
    };

    const found = (appids: number[]) =>
        HttpResponse.json(
            appids.map((appid) => ({
                appid,
                achievements: { total: 10, unlocked: appid % 10 },
            }))
        );

    it("asks a batch at a time and settles every game", async () => {
        const asked = answering(found);
        const appids = Array.from({ length: 45 }, (_, i) => i + 1);
        const { result } = renderHook(() =>
            useSteamAchievements(STEAM_ID, appids)
        );
        expect(result.current.settled).toBe(0);
        expect(result.current.total).toBe(45);

        await waitFor(() => expect(result.current.settled).toBe(45));
        expect(asked.map((batch) => batch.length).sort()).toEqual([20, 20, 5]);
        expect(result.current.states.get(13)).toEqual({
            kind: "done",
            value: { total: 10, unlocked: 3 },
        });
    });

    it("stops and says so when the profile hides them", async () => {
        answering(() =>
            HttpResponse.json(
                { error: { code: "steam_private", message: "Private" } },
                { status: 422 }
            )
        );
        const { result } = renderHook(() =>
            useSteamAchievements(STEAM_ID, [1, 2, 3])
        );
        await waitFor(() => expect(result.current.hidden).toBe(true));
        expect(result.current.settled).toBe(3);
    });

    it("asks again for the ones that failed", async () => {
        let fail = true;
        answering((appids) =>
            fail
                ? HttpResponse.json({ error: {} }, { status: 502 })
                : found(appids)
        );
        const { result } = renderHook(() =>
            useSteamAchievements(STEAM_ID, [1, 2])
        );
        await waitFor(() => expect(result.current.failed).toBe(2));

        fail = false;
        act(() => result.current.retry());
        expect(result.current.failed).toBe(0);
        await waitFor(() => expect(result.current.settled).toBe(2));
        expect(result.current.states.get(2)?.kind).toBe("done");
    });

    it("waits and goes again when it's asked too often", async () => {
        let calls = 0;
        answering((appids) =>
            ++calls === 1
                ? HttpResponse.json({ error: {} }, { status: 429 })
                : found(appids)
        );
        const { result } = renderHook(() =>
            useSteamAchievements(STEAM_ID, [1], 0)
        );
        await waitFor(() =>
            expect(result.current.states.get(1)?.kind).toBe("done")
        );
        expect(calls).toBe(2);
    });

    it("asks nothing without a Steam id", () => {
        const asked = answering(found);
        const { result } = renderHook(() =>
            useSteamAchievements(undefined, [1])
        );
        expect(asked).toEqual([]);
        expect(result.current.settled).toBe(0);
    });
});
