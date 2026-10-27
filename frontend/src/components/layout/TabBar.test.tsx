import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { MyProfile } from "@playrates/shared";
import { renderWithProviders } from "../../test/renderWithProviders";
import { buildProfile } from "../../test/msw/handlers";
import TabBar from "./TabBar";

let user: MyProfile | null = null;
const openLogin = vi.fn();

vi.mock("../../contexts/AuthContext", () => ({
    useAuth: () => ({ user, signOut: vi.fn() }),
}));
vi.mock("../../contexts/AccountFormContext", () => ({
    useAccountForm: () => ({ openLogin, openSignup: vi.fn() }),
}));
// Setup is the sheet's own test; here it is finished.
vi.mock("../../hooks/useSetupSteps", () => ({ useSetupSteps: () => [] }));

const bar = (route = "/") => {
    renderWithProviders(<TabBar />, { route });
    return within(screen.getByRole("navigation", { name: "Main" }));
};

beforeEach(() => {
    user = buildProfile({ username: "devuser" });
});
afterEach(() => vi.restoreAllMocks());

describe("TabBar", () => {
    it("marks where you are, sections and their pages alike", () => {
        const tabs = bar("/community/thread/4");
        expect(tabs.getByRole("link", { name: "Community" })).toHaveAttribute(
            "aria-current",
            "page"
        );
        expect(tabs.getByRole("link", { name: "Home" })).not.toHaveAttribute(
            "aria-current"
        );
    });

    it("lights Profile on your own profile only", () => {
        expect(
            bar("/user/devuser/games?type=backlog").getByRole("link", {
                name: "Profile",
            })
        ).toHaveAttribute("aria-current", "page");
    });

    it("leaves Profile dark on somebody else's", () => {
        expect(
            bar("/user/frostbyte").getByRole("link", { name: "Profile" })
        ).not.toHaveAttribute("aria-current");
    });

    it("offers Sign in in Profile's place when signed out", async () => {
        user = null;
        const tabs = bar();
        expect(tabs.queryByRole("link", { name: "Profile" })).toBeNull();
        await userEvent.click(tabs.getByRole("button", { name: "Sign in" }));
        expect(openLogin).toHaveBeenCalled();
    });

    /* The menu's contents moved behind More; the header lost its button. */
    it("opens the rest behind More", async () => {
        await userEvent.click(bar().getByRole("button", { name: /^More/ }));
        const sheet = screen.getByRole("dialog", { name: "More" });
        expect(
            within(sheet).getByRole("link", { name: "Settings" })
        ).toBeInTheDocument();
        expect(
            within(sheet).getByRole("button", { name: "Sign out" })
        ).toBeInTheDocument();
    });

    it("takes you back to the top from the tab you are on", async () => {
        const scrollTo = vi
            .spyOn(window, "scrollTo")
            .mockImplementation(() => {});
        await userEvent.click(
            bar("/library").getByRole("link", { name: "Library" })
        );
        expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
    });
});
