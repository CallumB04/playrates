import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { Link, MemoryRouter } from "react-router-dom";
import { useReloadOnNewBuild } from "./useReloadOnNewBuild";
import { siteHasNewerBuild } from "../lib/buildVersion";

vi.mock("../lib/buildVersion", () => ({
    siteHasNewerBuild: vi.fn(),
}));

const reload = vi.fn();

const Page = () => {
    useReloadOnNewBuild();
    return (
        <>
            <Link to="/library">Library</Link>
            <input aria-label="Draft" />
        </>
    );
};

const comeBackToTab = async () => {
    await act(async () => {
        document.dispatchEvent(new Event("visibilitychange"));
    });
    await waitFor(() => expect(siteHasNewerBuild).toHaveBeenCalled());
};

beforeEach(() => {
    vi.stubGlobal("location", { ...window.location, reload });
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
});

describe("useReloadOnNewBuild", () => {
    it("loads the new build on the next change of page", async () => {
        vi.mocked(siteHasNewerBuild).mockResolvedValue(true);
        render(
            <MemoryRouter>
                <Page />
            </MemoryRouter>
        );
        await comeBackToTab();
        // Not mid-page: they may be typing.
        expect(reload).not.toHaveBeenCalled();

        act(() => screen.getByText("Library").click());
        expect(reload).toHaveBeenCalledTimes(1);
    });

    it("navigates normally while the tab is current", async () => {
        vi.mocked(siteHasNewerBuild).mockResolvedValue(false);
        render(
            <MemoryRouter>
                <Page />
            </MemoryRouter>
        );
        await comeBackToTab();

        act(() => screen.getByText("Library").click());
        expect(reload).not.toHaveBeenCalled();
    });
});
