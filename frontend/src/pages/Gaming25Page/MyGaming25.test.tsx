import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import type { Profile } from "@playrates/shared";
import { buildProfile } from "../../test/msw/handlers";
import { renderWithProviders } from "../../test/renderWithProviders";
import MyGaming25 from "./MyGaming25";

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

const render = () =>
    renderWithProviders(
        <Routes>
            <Route path="/gaming-25" element={<MyGaming25 />} />
            <Route path="/user/:username/gaming-25" element={<p>Grid</p>} />
        </Routes>,
        { route: "/gaming-25" }
    );

describe("MyGaming25", () => {
    it("sends you to your own grid", () => {
        auth.user = buildProfile();
        render();
        expect(screen.getByText("Grid")).toBeInTheDocument();
    });

    it("asks someone signed out to sign up", async () => {
        auth.user = null;
        render();
        await userEvent.click(screen.getByRole("button", { name: "Sign up" }));
        expect(auth.openSignup).toHaveBeenCalled();
    });
});
