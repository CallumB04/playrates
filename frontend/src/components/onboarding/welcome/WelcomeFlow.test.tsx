import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, screen, waitFor } from "@testing-library/react";
import { closeSetupStep, useSetupSheet } from "../../../lib/setupSheet";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../../../test/msw/server";
import {
    buildGameLog,
    buildProfile,
    buildShelfEntry,
    paginated,
} from "../../../test/msw/handlers";
import { renderWithProviders } from "../../../test/renderWithProviders";
import WelcomeFlow from "./WelcomeFlow";
import WelcomeGate from "../WelcomeGate";

const API = "http://localhost:3000/api/v1";

const auth = vi.hoisted(() => ({ user: null as unknown, isLoading: false }));
vi.mock("../../../contexts/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("../../../contexts/AccountFormContext", () => ({
    useAccountForm: () => ({ mode: null }),
}));

let writes: { method: string; url: string; body: unknown }[];

beforeEach(() => {
    sessionStorage.clear();
    auth.user = buildProfile({
        username: "newplayer",
        firstName: null,
        avatarUrl: null,
        onboardedAt: null,
        usernameChosenAt: "2026-11-12T00:00:00.000Z",
    });
    writes = [];
    const record =
        (reply: () => Response) =>
        async ({ request }: { request: Request }) => {
            const text = await request.text();
            writes.push({
                method: request.method,
                url: new URL(request.url).pathname,
                body: text ? JSON.parse(text) : null,
            });
            return reply();
        };
    server.use(
        http.patch(
            `${API}/profiles/me`,
            record(() => HttpResponse.json(buildProfile()))
        ),
        http.post(
            `${API}/profiles/me/onboarded`,
            record(() => HttpResponse.json(buildProfile()))
        ),
        http.post(
            `${API}/me/logs`,
            record(() => HttpResponse.json(buildGameLog()))
        ),
        http.patch(
            `${API}/me/logs/:id`,
            record(() => HttpResponse.json(buildGameLog()))
        )
    );
});

/** The welcome, opened at a step as a reload there would. */
const land = (step = "you") => {
    sessionStorage.setItem("pr_welcome_step", step);
    const onClose = vi.fn();
    renderWithProviders(<WelcomeFlow onClose={onClose} />);
    return onClose;
};

const heading = (name: string) => screen.findByRole("heading", { name });
const paths = () => writes.map((w) => `${w.method} ${w.url}`);

describe("WelcomeFlow", () => {
    it("starts with signing up already done, naming every step to come", async () => {
        land();
        await heading("What should we call you?");
        const bar = screen.getByRole("list", { name: "Your welcome" });
        expect(bar).toHaveTextContent("Account, done");
        expect(bar).toHaveTextContent("You, now");
        expect(bar).toHaveTextContent("Rate");
    });

    it("saves a first name, then asks for the games played", async () => {
        land();
        await userEvent.type(
            await screen.findByLabelText("First name"),
            "Callum"
        );
        await userEvent.click(screen.getByRole("button", { name: "Continue" }));

        expect(await heading("Games you’ve played")).toBeInTheDocument();
        expect(writes[0]).toMatchObject({
            method: "PATCH",
            body: {
                firstName: "Callum",
                aboutVisibility: { firstName: "everyone" },
            },
        });
    });

    it("keeps the name hidden when asked to as it's given", async () => {
        land();
        await userEvent.type(
            await screen.findByLabelText("First name"),
            "Callum"
        );
        await userEvent.click(
            screen.getByRole("switch", { name: "Show it on my profile" })
        );
        await userEvent.click(screen.getByRole("button", { name: "Continue" }));
        await heading("Games you’ve played");
        expect(writes[0]).toMatchObject({
            body: { aboutVisibility: { firstName: "private" } },
        });
    });

    it("writes nothing when going on with nothing filled in, or skipping", async () => {
        land();
        await userEvent.click(
            await screen.findByRole("button", { name: "Continue" })
        );
        await heading("Games you’ve played");
        await userEvent.click(
            screen.getByRole("button", { name: "Skip for now" })
        );
        // Nothing of theirs to rate, so straight past that step.
        expect(await heading("How PlayRates works")).toBeInTheDocument();
        expect(writes).toEqual([]);
    });

    it("stays put when saving fails, keeping what was typed", async () => {
        server.use(
            http.patch(
                `${API}/profiles/me`,
                () => new HttpResponse(null, { status: 500 })
            )
        );
        land();
        await userEvent.type(
            await screen.findByLabelText("First name"),
            "Callum"
        );
        await userEvent.click(screen.getByRole("button", { name: "Continue" }));
        await waitFor(() =>
            expect(
                screen.getByRole("button", { name: "Continue" })
            ).toBeEnabled()
        );
        expect(screen.getByLabelText("First name")).toHaveValue("Callum");
    });

    it("puts the games picked on the shelves, played or playing", async () => {
        land("games");
        await userEvent.click(
            await screen.findByRole("button", { name: "Portal 2" })
        );
        await userEvent.click(
            screen.getByRole("button", { name: "Playing Portal 2 now" })
        );
        expect(screen.getByText("1 playing")).toBeInTheDocument();
        expect(screen.getByText("+10 XP")).toBeInTheDocument();
        await userEvent.click(
            screen.getByRole("button", { name: "Add 1 game" })
        );
        await waitFor(() =>
            expect(writes).toContainEqual({
                method: "POST",
                url: "/api/v1/me/logs",
                body: { gameId: 2, status: "playing" },
            })
        );
    });

    it("asks for ratings of the games played without one, saving each", async () => {
        server.use(
            http.get(`${API}/me/shelf`, () =>
                HttpResponse.json(
                    paginated([
                        buildShelfEntry([
                            buildGameLog({ id: 31, rating: null }),
                        ]),
                    ])
                )
            )
        );
        land("rate");
        await heading("Add your ratings");
        const meter = await screen.findByRole("slider", {
            name: "The Witcher 3: Wild Hunt",
        });
        meter.focus();
        await userEvent.keyboard("{ArrowRight}");
        await waitFor(() =>
            expect(writes).toContainEqual(
                expect.objectContaining({
                    method: "PATCH",
                    url: "/api/v1/me/logs/31",
                })
            )
        );
    });

    it("walks the tour a card at a time, then finishes and marks it seen", async () => {
        land("tour");
        await heading("How PlayRates works");
        await userEvent.click(screen.getByRole("button", { name: "Next" }));
        await userEvent.click(screen.getByRole("button", { name: "Next" }));
        await userEvent.click(screen.getByRole("button", { name: "Continue" }));

        expect(await heading("You’re set, newplayer")).toBeInTheDocument();
        await waitFor(() =>
            expect(paths()).toContain("POST /api/v1/profiles/me/onboarded")
        );
        expect(
            screen.getByRole("list", { name: "Your welcome" })
        ).toHaveTextContent("Done, done");
    });

    it("marks it seen when closed part way", async () => {
        const onClose = land("games");
        await heading("Games you’ve played");
        await userEvent.click(screen.getByRole("button", { name: "Close" }));
        expect(onClose).toHaveBeenCalled();
        await waitFor(() =>
            expect(paths()).toContain("POST /api/v1/profiles/me/onboarded")
        );
    });

    it("sends a next step out of the welcome to its own sheet", async () => {
        const sheet = renderHook(() => useSetupSheet());
        const onClose = land("done");
        await userEvent.click(
            await screen.findByRole("button", { name: /^Review / })
        );
        expect(onClose).toHaveBeenCalled();
        expect(sheet.result.current).toBe("review");
        act(() => closeSetupStep());
    });

    it("opens for an account never welcomed, and not for one already", async () => {
        renderWithProviders(<WelcomeGate />);
        expect(await heading("What should we call you?")).toBeInTheDocument();
    });

    // Reaching the end marks it seen; it mustn't vanish from that very step.
    it("stays open on the last step after it's marked seen", async () => {
        sessionStorage.setItem("pr_welcome_step", "done");
        const { rerender } = renderWithProviders(<WelcomeGate />);
        await heading("You’re set, newplayer");
        await waitFor(() =>
            expect(paths()).toContain("POST /api/v1/profiles/me/onboarded")
        );
        auth.user = buildProfile({
            username: "newplayer",
            onboardedAt: "2026-11-12T00:00:00.000Z",
        });
        rerender(<WelcomeGate />);
        expect(
            screen.getByRole("heading", { name: /You’re set/ })
        ).toBeInTheDocument();
        await userEvent.click(screen.getByRole("button", { name: "Let’s go" }));
        await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    });

    it("stays shut for someone already welcomed, and over the join pages", () => {
        auth.user = buildProfile({ onboardedAt: "2026-01-01T00:00:00.000Z" });
        renderWithProviders(<WelcomeGate />);
        expect(screen.queryByRole("dialog")).toBeNull();

        auth.user = buildProfile({ onboardedAt: null });
        renderWithProviders(<WelcomeGate />, { route: "/join/confirmed" });
        expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("lets an admin walk it in preview without saving a thing", async () => {
        renderWithProviders(<WelcomeFlow preview onClose={vi.fn()} />);
        await userEvent.type(
            await screen.findByLabelText("First name"),
            "Callum"
        );
        await userEvent.click(screen.getByRole("button", { name: "Continue" }));
        await heading("Games you’ve played");
        expect(
            screen.getByText("Preview. Nothing you enter here is saved.")
        ).toBeInTheDocument();
        expect(writes).toEqual([]);
    });
});
