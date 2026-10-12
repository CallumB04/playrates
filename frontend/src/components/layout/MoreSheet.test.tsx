import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { buildProfile } from "../../test/msw/handlers";
import { setupSteps } from "../../lib/setupChecklist";
import MoreSheet from "./MoreSheet";

const steps = setupSteps({
    profile: { username: "devuser", avatarUrl: null, bio: "Hello" },
    logCount: 2,
    reviewCount: 0,
    friendCount: 0,
    postCount: 0,
});

const sheet = (props: Partial<Parameters<typeof MoreSheet>[0]> = {}) => {
    const on = {
        onClose: vi.fn(),
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
    it("keeps everything the menus held: shelves, settings, admin", () => {
        sheet({ user: buildProfile({ username: "devuser", isAdmin: true }) });
        expect(screen.getByRole("link", { name: /Backlog/ })).toHaveAttribute(
            "href",
            "/user/devuser?type=backlog"
        );
        expect(screen.getByRole("link", { name: "Settings" })).toBeVisible();
        expect(screen.getByRole("link", { name: "Admin" })).toHaveAttribute(
            "href",
            "/admin"
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
