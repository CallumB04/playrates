import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "../../test/msw/server";
import { buildProfile, buildProgress } from "../../test/msw/handlers";
import { renderWithProviders } from "../../test/renderWithProviders";
import JoinConfirmedPage from "./JoinConfirmedPage";

const auth = vi.hoisted(() => ({
    user: null as unknown,
    isLoading: false,
    resendConfirmation: vi.fn(),
}));
vi.mock("../../contexts/AuthContext", () => ({ useAuth: () => auth }));

beforeEach(() => {
    auth.user = null;
    auth.isLoading = false;
});

const land = (route = "/join/confirmed") =>
    renderWithProviders(<JoinConfirmedPage />, { route });

describe("JoinConfirmedPage", () => {
    it("welcomes someone the link signed in, by name, with one way on", () => {
        auth.user = buildProfile({ firstName: "Kai" });
        land();
        expect(
            screen.getByRole("heading", { name: "You’re in, Kai" })
        ).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "Get started" })
        ).toBeInTheDocument();
        // Into the welcome, not round it.
        expect(screen.queryByRole("link")).toBeNull();
    });

    it("tells one of the first 100 members they're a Founding Member", async () => {
        server.use(
            http.post("http://localhost:3000/api/v1/me/progress", () =>
                HttpResponse.json(
                    buildProgress({
                        unseen: {
                            xp: [],
                            badges: [
                                {
                                    badge: "founding_member",
                                    metal: 4,
                                    unlockedAt: "",
                                },
                            ],
                            tokens: 0,
                        },
                    })
                )
            )
        );
        auth.user = buildProfile({ firstName: "Kai" });
        land();
        expect(await screen.findByText("Founding Member")).toBeInTheDocument();
    });

    it("says nothing of it to anyone who came later", async () => {
        auth.user = buildProfile({ firstName: "Kai" });
        land();
        await screen.findByRole("heading", { name: "You’re in, Kai" });
        expect(screen.queryByText("Founding Member")).toBeNull();
    });

    it("offers a new link right here when the old one ran out", () => {
        land("/join/confirmed?link=expired");
        expect(
            screen.getByRole("heading", { name: "That link has run out" })
        ).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "Send a new link" })
        ).toBeInTheDocument();
    });

    it("says so when a link didn't work at all", () => {
        land("/join/confirmed?link=failed");
        expect(
            screen.getByRole("heading", { name: "That link didn’t work" })
        ).toBeInTheDocument();
    });

    it("waits while the sign-in settles rather than saying there's nothing", () => {
        auth.isLoading = true;
        land();
        expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    });

    it("sends someone here by chance to sign up", () => {
        land();
        expect(
            screen.getByRole("heading", { name: "Nothing to confirm" })
        ).toBeInTheDocument();
        expect(
            screen.getByRole("link", { name: "Create an account" })
        ).toHaveAttribute("href", "/join");
    });
});
