import { describe, expect, it, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { server } from "../../test/msw/server";
import { createTestQueryClient } from "../../test/renderWithProviders";
import { buildGameLog, paginated } from "../../test/msw/handlers";
import { useGame, useGames, useSiteStats } from "./useGames";
import { useUserGameLogs } from "./useGameLogs";
import { useUserReviews } from "./useReviews";
import { useProfile } from "./useProfiles";

const API = "http://localhost:3000/api/v1";

/** A fresh client per hook under test, so caches never leak between tests. */
const wrapper = () => {
    const client = createTestQueryClient();
    const Wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    Wrapper.displayName = "TestQueryWrapper";
    return Wrapper;
};

describe("query hooks", () => {
    it("loads the games list", async () => {
        const { result } = renderHook(() => useGames(), {
            wrapper: wrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.data).toHaveLength(2);
        expect(result.current.data?.data[0]?.title).toBe(
            "The Witcher 3: Wild Hunt"
        );
    });

    it("loads the site stats used by the home page", async () => {
        const { result } = renderHook(() => useSiteStats(), {
            wrapper: wrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual({
            userCount: 2,
            gameCount: 6,
            logCount: 1,
        });
    });

    /**
     * Without the `enabled` guards these fire a request for id 0 or an empty
     * username on first render, and get a 404 back.
     */
    it("does not request a game until it has an id", async () => {
        const spy = vi.fn();
        server.use(
            http.get(`${API}/games/:id`, ({ params }) => {
                spy(params.id);
                return HttpResponse.json({});
            })
        );

        const { result } = renderHook(() => useGame(undefined), {
            wrapper: wrapper(),
        });

        expect(result.current.fetchStatus).toBe("idle");
        expect(spy).not.toHaveBeenCalled();
    });

    it("does not request a profile until it has a username", () => {
        const { result } = renderHook(() => useProfile(undefined), {
            wrapper: wrapper(),
        });

        expect(result.current.fetchStatus).toBe("idle");
    });

    it("surfaces a 404 as an error rather than retrying", async () => {
        server.use(
            http.get(`${API}/profiles/:username`, () =>
                HttpResponse.json(
                    {
                        error: {
                            code: "not_found",
                            message: "Profile not found",
                        },
                    },
                    { status: 404 }
                )
            )
        );

        const { result } = renderHook(() => useProfile("ghost"), {
            wrapper: wrapper(),
        });

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(result.current.error).toMatchObject({ status: 404 });
    });

    /** The embedded game is what saves a request per tile. */
    it("returns game logs with the game already embedded", async () => {
        const { result } = renderHook(() => useUserGameLogs("devuser"), {
            wrapper: wrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        const log = result.current.data?.data[0];
        expect(log?.game?.title).toBe("The Witcher 3: Wild Hunt");
        expect(log?.gameId).toBe(1);
        // the log's own id, not the game id
        expect(log?.id).not.toBe(log?.gameId);
    });

    it("passes a status filter through to the request", async () => {
        let url = "";
        server.use(
            http.get(`${API}/users/:username/game-logs`, ({ request }) => {
                url = request.url;
                return HttpResponse.json(paginated([buildGameLog()]));
            })
        );

        const { result } = renderHook(
            () => useUserGameLogs("devuser", "backlog"),
            { wrapper: wrapper() }
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(url).toContain("status=backlog");
    });

    it("loads a user's reviews with the rating joined on", async () => {
        const { result } = renderHook(() => useUserReviews("devuser"), {
            wrapper: wrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        const review = result.current.data?.data[0];
        expect(review?.rating).toBe(9.5);
        expect(review?.hoursPlayed).toBe(41);
        expect(review?.author.username).toBe("devuser");
        // The game rides along, so a review can link back to it from a feed.
        expect(review?.game.title).toBe("The Witcher 3: Wild Hunt");
    });
});
