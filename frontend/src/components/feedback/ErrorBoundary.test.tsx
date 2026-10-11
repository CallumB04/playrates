import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import ErrorBoundary from "./ErrorBoundary";
import { siteHasNewerBuild } from "../../lib/buildVersion";

vi.mock("../../lib/buildVersion", () => ({
    siteHasNewerBuild: vi.fn(),
}));

const Crash = (): never => {
    throw new TypeError('can\'t access property "avatarUrl", author is null');
};

const reload = vi.fn();

beforeEach(() => {
    sessionStorage.clear();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("location", { ...window.location, reload });
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    reload.mockReset();
});

describe("ErrorBoundary", () => {
    it("loads the new build when the crash came from running an old one", async () => {
        vi.mocked(siteHasNewerBuild).mockResolvedValue(true);
        render(
            <ErrorBoundary>
                <Crash />
            </ErrorBoundary>
        );

        await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
        expect(screen.getByText(/has been updated/)).toBeInTheDocument();
    });

    it("shows the error when this is the current build", async () => {
        vi.mocked(siteHasNewerBuild).mockResolvedValue(false);
        render(
            <ErrorBoundary>
                <Crash />
            </ErrorBoundary>
        );

        expect(
            await screen.findByText("Something went wrong")
        ).toBeInTheDocument();
        await Promise.resolve();
        expect(reload).not.toHaveBeenCalled();
    });

    /* If the new build breaks as well, reloading again would loop forever. */
    it("does not reload twice in a row", async () => {
        vi.mocked(siteHasNewerBuild).mockResolvedValue(true);
        sessionStorage.setItem(
            "playrates:reloaded-for-new-build",
            String(Date.now())
        );
        render(
            <ErrorBoundary>
                <Crash />
            </ErrorBoundary>
        );

        expect(
            await screen.findByText("Something went wrong")
        ).toBeInTheDocument();
        await waitFor(() => expect(siteHasNewerBuild).toHaveBeenCalled());
        expect(reload).not.toHaveBeenCalled();
    });
});
