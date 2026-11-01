import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { Shop } from "@playrates/shared";
import { server } from "../../test/msw/server";
import { buildProfile } from "../../test/msw/handlers";
import { renderWithProviders } from "../../test/renderWithProviders";
import ShopPage from "./ShopPage";

const user = buildProfile();
const auth: { user: typeof user | null } = { user };
vi.mock("../../contexts/AuthContext", () => ({
    useAuth: () => ({ user: auth.user, isLoading: false }),
}));
vi.mock("../../contexts/AccountFormContext", () => ({
    useAccountForm: () => ({ openSignup: vi.fn(), openLogin: vi.fn() }),
}));

const API = "http://localhost:3000/api/v1";

const shop: Shop = {
    tokens: 200,
    items: [
        {
            item: "slot_pinned_review",
            kind: "slot",
            group: "slot",
            label: "Pinned reviews",
            price: 60,
            owned: 0,
            maxOwned: 3,
            affordable: true,
        },
    ],
};

describe("ShopPage", () => {
    // A link can name an item to open.
    it("opens the item a link names, and lets it go on close", async () => {
        server.use(http.get(`${API}/shop`, () => HttpResponse.json(shop)));
        renderWithProviders(<ShopPage />, {
            route: "/shop?item=slot_pinned_review",
        });
        const sheet = await screen.findByRole("dialog");
        expect(sheet).toHaveTextContent("Pinned reviews");
        await userEvent.click(screen.getByRole("button", { name: /close/i }));
        expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("asks someone signed out to sign up, rather than sending them away", () => {
        auth.user = null;
        renderWithProviders(<ShopPage />, { route: "/shop" });
        expect(
            screen.getByRole("heading", { name: "Sign up to use the shop" })
        ).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "Sign up" })
        ).toBeInTheDocument();
        auth.user = user;
    });
});
