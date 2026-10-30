import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../../test/msw/server";
import { buildProfile } from "../../test/msw/handlers";
import { renderWithProviders } from "../../test/renderWithProviders";
import InviteBanner from "./InviteBanner";

const auth = vi.hoisted(() => ({ user: null as unknown }));
const openSignup = vi.hoisted(() => vi.fn());
vi.mock("../../contexts/AuthContext", () => ({
    useAuth: () => ({ user: auth.user, isLoading: false }),
}));
vi.mock("../../contexts/AccountFormContext", () => ({
    useAccountForm: () => ({ openSignup }),
}));

const API = "http://localhost:3000/api/v1";

beforeEach(() => {
    auth.user = null;
    globalThis.sessionStorage?.clear?.();
    globalThis.localStorage?.clear?.();
    server.use(
        http.get(`${API}/referrals/marlowe`, () =>
            HttpResponse.json({
                username: "marlowe",
                avatarUrl: null,
                accent: "rose",
                level: 11,
                frame: null,
                reward: { xp: 100, tokens: 25 },
            })
        )
    );
});

describe("InviteBanner", () => {
    it("says who invited a visitor and what joining is worth", async () => {
        renderWithProviders(<InviteBanner />, { route: "/?ref=marlowe" });
        expect(
            await screen.findByText("marlowe invited you to PlayRates")
        ).toBeInTheDocument();
        await userEvent.click(
            screen.getByRole("button", { name: "Join PlayRates" })
        );
        expect(openSignup).toHaveBeenCalled();
    });

    it("goes when closed", async () => {
        renderWithProviders(<InviteBanner />, { route: "/?ref=marlowe" });
        await userEvent.click(
            await screen.findByRole("button", { name: "Close" })
        );
        expect(screen.queryByText(/invited you/)).toBeNull();
    });

    it("says nothing to someone signed in", async () => {
        auth.user = buildProfile();
        renderWithProviders(<InviteBanner />, { route: "/?ref=marlowe" });
        await new Promise((r) => setTimeout(r, 50));
        expect(screen.queryByText(/invited you/)).toBeNull();
    });
});
