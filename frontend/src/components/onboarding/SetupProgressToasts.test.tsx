import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { setupSteps } from "../../lib/setupChecklist";
import SetupProgressToasts from "./SetupProgressToasts";

const state = vi.hoisted(() => ({
    user: null as { id: string } | null,
    steps: null as unknown,
    notify: vi.fn(),
}));

vi.mock("../../contexts/AuthContext", () => ({
    useAuth: () => ({ user: state.user }),
}));
vi.mock("../../contexts/NotificationContext", () => ({
    useNotify: () => state.notify,
}));
vi.mock("../../hooks/useSetupSteps", () => ({
    useSetupSteps: () => state.steps,
}));

const at = (bio: string, logCount = 0) =>
    setupSteps({
        profile: { avatarUrl: null, bio },
        logCount,
        friendCount: 0,
    });

beforeEach(() => {
    state.user = { id: "a" };
    state.steps = at("");
    state.notify.mockReset();
});

describe("SetupProgressToasts", () => {
    /* Where an account stands when the page loads is not news. */
    it("says nothing on the first look", () => {
        state.steps = at("Hello", 3);
        render(<SetupProgressToasts />);
        expect(state.notify).not.toHaveBeenCalled();
    });

    it("toasts a step done while the tab is open", () => {
        const { rerender } = render(<SetupProgressToasts />);
        state.steps = at("Hello");
        rerender(<SetupProgressToasts />);
        expect(state.notify).toHaveBeenCalledWith(
            "Bio written. Get started: 1 of 4 done.",
            "success"
        );
    });

    it("says nothing while the steps are still loading", () => {
        state.steps = null;
        const { rerender } = render(<SetupProgressToasts />);
        state.steps = at("Hello");
        rerender(<SetupProgressToasts />);
        expect(state.notify).not.toHaveBeenCalled();
    });

    /* Signing in as someone further along is not them finishing a step. */
    it("treats another account as a first look", () => {
        const { rerender } = render(<SetupProgressToasts />);
        state.user = { id: "b" };
        state.steps = at("Hello", 2);
        rerender(<SetupProgressToasts />);
        expect(state.notify).not.toHaveBeenCalled();
    });
});
