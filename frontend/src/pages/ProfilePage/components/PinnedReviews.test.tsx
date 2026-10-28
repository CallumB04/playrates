import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "../../../test/msw/server";
import { buildProfile, buildProgress } from "../../../test/msw/handlers";
import { renderWithProviders } from "../../../test/renderWithProviders";
import PinnedReviews from "./PinnedReviews";

vi.mock("../../../contexts/AuthContext", () => ({
    useAuth: () => ({ user: buildProfile({ username: "devuser" }) }),
}));

const API = "http://localhost:3000/api/v1";

describe("PinnedReviews", () => {
    // A gifted slot's notification links here to pick what goes in it.
    it("opens the picker when the link asks", async () => {
        const base = buildProgress();
        server.use(
            http.get(`${API}/me/progress`, () =>
                HttpResponse.json({
                    ...base,
                    look: { ...base.look, pinnedReviewSlots: 2 },
                })
            )
        );
        renderWithProviders(
            <PinnedReviews username="devuser" ids={[]} isOwner />,
            { route: "/user/devuser?edit=pinned_reviews" }
        );
        expect(
            await screen.findByText(/in the order you want them/)
        ).toBeInTheDocument();
    });

    it("leaves it shut otherwise", async () => {
        renderWithProviders(
            <PinnedReviews username="devuser" ids={[]} isOwner />,
            { route: "/user/devuser" }
        );
        await new Promise((r) => setTimeout(r, 50));
        expect(screen.queryByRole("dialog")).toBeNull();
    });
});
