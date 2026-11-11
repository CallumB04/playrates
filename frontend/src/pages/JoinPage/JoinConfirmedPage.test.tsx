import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { buildProfile } from "../../test/msw/handlers";
import { renderWithProviders } from "../../test/renderWithProviders";
import JoinConfirmedPage from "./JoinConfirmedPage";

const auth = vi.hoisted(() => ({
    user: null as unknown,
    isLoading: false,
    resendConfirmation: vi.fn(),
}));
vi.mock("../../contexts/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("../../contexts/AccountFormContext", () => ({
    useAccountForm: () => ({ openLogin: vi.fn() }),
}));

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
