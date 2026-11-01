import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes, useLocation } from "react-router-dom";
import type { Profile } from "@playrates/shared";
import { buildProfile } from "../../test/msw/handlers";
import { renderWithProviders } from "../../test/renderWithProviders";
import MyProfile from "./MyProfile";

const auth = vi.hoisted(() => ({
    user: null as Profile | null,
    openSignup: vi.fn(),
}));
vi.mock("../../contexts/AuthContext", () => ({
    useAuth: () => ({ user: auth.user, isLoading: false }),
}));
vi.mock("../../contexts/AccountFormContext", () => ({
    useAccountForm: () => ({ openSignup: auth.openSignup, openLogin: vi.fn() }),
}));

const Landed = () => {
    const { pathname, search, hash } = useLocation();
    return <p>Landed on {pathname + search + hash}</p>;
};

const render = (route: string) =>
    renderWithProviders(
        <Routes>
            <Route path="/me/*" element={<MyProfile />} />
            <Route path="/user/*" element={<Landed />} />
        </Routes>,
        { route }
    );

describe("MyProfile", () => {
    it.each([
        ["/me", "/user/devuser"],
        ["/me/lists", "/user/devuser/lists"],
        ["/me/games?type=wishlist", "/user/devuser/games?type=wishlist"],
        ["/me/gaming-25", "/user/devuser/gaming-25"],
        ["/me?edit=profile#top", "/user/devuser?edit=profile#top"],
    ])("sends %s to the same place on your own profile", (from, to) => {
        auth.user = buildProfile({ username: "devuser" });
        render(from);
        expect(screen.getByText(`Landed on ${to}`)).toBeInTheDocument();
    });

    it("asks someone signed out to sign up, saying what the link is for", async () => {
        auth.user = null;
        render("/me/lists");
        expect(
            screen.getByRole("heading", {
                name: "Sign up to get your own profile",
            })
        ).toBeInTheDocument();
        await userEvent.click(screen.getByRole("button", { name: "Sign up" }));
        expect(auth.openSignup).toHaveBeenCalled();
    });

    it("says what Gaming 25 is, for a link to it", () => {
        auth.user = null;
        render("/me/gaming-25");
        expect(
            screen.getByRole("heading", {
                name: "Sign up to make your Gaming 25",
            })
        ).toBeInTheDocument();
    });
});
