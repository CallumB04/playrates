import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { TasteMatch } from "@playrates/shared";
import { server } from "../../test/msw/server";
import { buildProfile } from "../../test/msw/handlers";
import { renderWithProviders } from "../../test/renderWithProviders";
import PeoplePage from "./PeoplePage";

const me = buildProfile();
vi.mock("../../contexts/AuthContext", () => ({
    useAuth: () => ({ user: me, isLoading: false }),
}));

vi.mock("../../contexts/AccountFormContext", () => ({
    useAccountForm: () => ({ openSignup: vi.fn() }),
}));

const API = "http://localhost:3000/api/v1";

const ana = buildProfile({ id: "b", username: "ana" });
const match: TasteMatch = {
    user: {
        id: ana.id,
        username: ana.username,
        avatarUrl: null,
        accent: ana.accent,
        bio: "",
        online: false,
    },
    shared: 9,
    agreement: 87,
};

describe("PeoplePage", () => {
    it("shows who rates like you, then who has the name you search for", async () => {
        server.use(
            http.get(`${API}/me/friends/matches`, () =>
                HttpResponse.json({ data: [match] })
            ),
            http.get(`${API}/profiles`, ({ request }) =>
                HttpResponse.json({
                    data:
                        new URL(request.url).searchParams.get("search") === "cy"
                            ? [buildProfile({ id: "c", username: "cyrus" })]
                            : [],
                    meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
                })
            )
        );
        renderWithProviders(<PeoplePage />, { route: "/people" });

        expect(await screen.findByText("ana")).toBeInTheDocument();
        expect(screen.getByText("87% alike · 9 games")).toBeInTheDocument();

        await userEvent.type(screen.getByRole("searchbox"), "cy");
        expect(await screen.findByText("cyrus")).toBeInTheDocument();
        expect(screen.queryByText("ana")).toBeNull();
    });

    it("says what to do when there are no matches yet", async () => {
        server.use(
            http.get(`${API}/me/friends/matches`, () =>
                HttpResponse.json({ data: [] })
            )
        );
        renderWithProviders(<PeoplePage />, { route: "/people" });
        expect(
            await screen.findByText(/Rate a few more games/)
        ).toBeInTheDocument();
    });
});
