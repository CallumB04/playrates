import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { buildProfile, buildProgress } from "../test/msw/handlers";
import { useSetupSteps } from "./useSetupSteps";

const auth = vi.hoisted(() => ({ user: null as unknown }));
const progress = vi.hoisted(() => ({ data: undefined as unknown }));

vi.mock("../contexts/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("./queries/useProgress", () => ({ useProgressQuery: () => progress }));

const steps = () => renderHook(() => useSetupSteps()).result.current;

beforeEach(() => {
    auth.user = buildProfile();
    progress.data = buildProgress();
});

describe("useSetupSteps", () => {
    it("has nothing for someone signed out", () => {
        auth.user = null;
        expect(steps()).toBeNull();
    });

    it("waits for progress before saying anything", () => {
        progress.data = undefined;
        expect(steps()).toBeNull();
    });

    it("ticks off what progress says is done", () => {
        const base = buildProgress();
        progress.data = {
            ...base,
            setup: {
                ...base.setup,
                steps: { ...base.setup.steps, friend: true },
            },
        };
        expect(steps()?.find((s) => s.key === "friend")?.done).toBe(true);
        expect(steps()?.find((s) => s.key === "post")?.done).toBe(false);
    });
});
