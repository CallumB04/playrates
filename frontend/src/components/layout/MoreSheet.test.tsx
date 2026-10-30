import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { buildProfile } from "../../test/msw/handlers";
import { setupSteps } from "../../lib/setupChecklist";
import MoreSheet from "./MoreSheet";

const steps = setupSteps("devuser", {
    picture: false,
    bio: true,
    log: true,
    rate: false,
    review: false,
    favourites: false,
    friend: false,
    post: false,
});

const sheet = (props: Partial<Parameters<typeof MoreSheet>[0]> = {}) => {
    const on = {
        onClose: vi.fn(),
        onInvite: vi.fn(),
        onSignIn: vi.fn(),
        onSignUp: vi.fn(),
        onSignOut: vi.fn(),
    };
    renderWithProviders(
        <MoreSheet user={buildProfile()} setup={null} {...on} {...props} />
    );
    return on;
};

describe("MoreSheet", () => {
    // The share sheet opens over the page, not inside this one closing.
    it("shuts itself and hands inviting on", async () => {
        const on = sheet();
        await userEvent.click(
            screen.getByRole("button", { name: /Invite friends/ })
        );
        expect(on.onClose).toHaveBeenCalled();
        expect(on.onInvite).toHaveBeenCalled();
    });

    it("offers no invite signed out", () => {
        sheet({ user: null });
        expect(
            screen.queryByRole("button", { name: /Invite friends/ })
        ).toBeNull();
    });

    it("keeps everything the menus held: shelves, settings, admin", () => {
        sheet({ user: buildProfile({ username: "devuser", isAdmin: true }) });
        expect(screen.getByRole("link", { name: /Backlog/ })).toHaveAttribute(
            "href",
            "/user/devuser/games?type=backlog"
        );
        // The bar's Profile tab is the way there; not twice.
        expect(screen.queryByRole("link", { name: /devuser$/ })).toBeNull();
        expect(screen.getByRole("link", { name: "Settings" })).toBeVisible();
        expect(screen.getByRole("link", { name: "Admin" })).toHaveAttribute(
            "href",
            "/admin"
        );
    });

    it("leads with your level and tokens, and has the shop", async () => {
        sheet();
        const level = await screen.findByRole("link", { name: /^Level \d+/ });
        expect(level).toHaveAttribute("href", "/progress");
        expect(screen.getByRole("link", { name: "Shop" })).toHaveAttribute(
            "href",
            "/shop"
        );
    });

    it("says nothing about admin to anyone else", () => {
        sheet();
        expect(screen.queryByRole("link", { name: "Admin" })).toBeNull();
    });

    /* Open from the start it pushed Sign out below a phone's fold. */
    it("folds Get started into one row until asked", async () => {
        sheet({ setup: steps });
        const row = screen.getByRole("button", { name: /Get started/ });
        expect(row).toHaveAttribute("aria-expanded", "false");
        expect(screen.queryByText("Add a profile picture")).toBeNull();

        await userEvent.click(row);
        expect(
            screen.getByRole("link", { name: "Add a profile picture" })
        ).toBeInTheDocument();
    });

    it("signs out, closing first", async () => {
        const on = sheet();
        await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
        expect(on.onClose).toHaveBeenCalled();
        expect(on.onSignOut).toHaveBeenCalled();
    });

    it("offers joining and signing in to someone signed out", async () => {
        const on = sheet({ user: null });
        expect(screen.queryByRole("button", { name: "Sign out" })).toBeNull();
        await userEvent.click(
            screen.getByRole("button", { name: "Join PlayRates" })
        );
        expect(on.onSignUp).toHaveBeenCalled();
    });
});
