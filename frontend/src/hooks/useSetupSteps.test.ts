import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { buildProfile } from "../test/msw/handlers";
import { useSetupSteps } from "./useSetupSteps";

const auth = vi.hoisted(() => ({ user: null as unknown }));
const logs = vi.hoisted(() => ({ data: undefined as unknown }));
const friends = vi.hoisted(() => ({ data: undefined as unknown }));
const reviews = vi.hoisted(() => ({ data: undefined as unknown }));
const threads = vi.hoisted(() => ({ data: undefined as unknown }));

vi.mock("../contexts/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("./queries/useGameLogs", () => ({ useMyGameLogIds: () => logs }));
vi.mock("./queries/useFriends", () => ({ useMyFriends: () => friends }));
vi.mock("./queries/useReviews", () => ({ useUserReviews: () => reviews }));
vi.mock("./queries/useCommunity", () => ({ useThreads: () => threads }));

const steps = () => renderHook(() => useSetupSteps()).result.current;

beforeEach(() => {
    auth.user = buildProfile({ avatarUrl: null, bio: "" });
    logs.data = [];
    friends.data = [];
    reviews.data = { meta: { total: 0 } };
    threads.data = { meta: { total: 0 } };
});

describe("useSetupSteps", () => {
    it("has nothing for someone signed out", () => {
        auth.user = null;
        expect(steps()).toBeNull();
    });

    it("waits for every count before saying anything", () => {
        logs.data = undefined;
        expect(steps()).toBeNull();
        logs.data = [];
        threads.data = undefined;
        expect(steps()).toBeNull();
    });

    it("reads reviews and community posts off their totals", () => {
        reviews.data = { meta: { total: 2 } };
        threads.data = { meta: { total: 1 } };
        const done = Object.fromEntries(
            (steps() ?? []).map((s) => [s.key, s.done])
        );
        expect(done.review).toBe(true);
        expect(done.post).toBe(true);
    });

    /* A pending request is not a friend, so it does not tick the box. */
    it("counts accepted friends only", () => {
        logs.data = [{ gameId: 1 }];
        friends.data = [{ status: "request-sent" }, { status: "friend" }];
        const done = Object.fromEntries(
            (steps() ?? []).map((s) => [s.key, s.done])
        );
        expect(done).toEqual({
            picture: false,
            bio: false,
            log: true,
            review: false,
            friend: true,
            post: false,
        });

        friends.data = [{ status: "request-sent" }];
        expect(steps()?.find((s) => s.key === "friend")?.done).toBe(false);
    });
});
