import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { levelFor, type Progress } from "@playrates/shared";
import { server } from "../../test/msw/server";
import { buildProfile, buildProgress } from "../../test/msw/handlers";
import { renderWithProviders } from "../../test/renderWithProviders";
import ProgressMoments from "./ProgressMoments";

vi.mock("../../contexts/AuthContext", () => ({
    useAuth: () => ({ user: buildProfile() }),
    useUser: () => buildProfile(),
}));

const API = "http://localhost:3000/api/v1";

// jsdom has no canvas; the confetti has nothing to draw on, which is fine.
HTMLCanvasElement.prototype.getContext = () => null;

const progress = (overrides: Partial<Progress> = {}): Progress =>
    buildProgress({
        xp: 120,
        level: levelFor(120),
        tokens: 10,
        streak: {
            weeks: 1,
            best: 1,
            thisWeek: true,
            freeShield: true,
            spareShields: 0,
            history: [],
        },
        ...overrides,
    });

let seen: unknown[];

beforeEach(() => {
    seen = [];
    server.use(
        http.post(`${API}/me/progress/seen`, async ({ request }) => {
            seen.push(await request.json());
            return new HttpResponse(null, { status: 204 });
        }),
        http.post(
            `${API}/me/progress/revealed`,
            () => new HttpResponse(null, { status: 204 })
        )
    );
});

const respond = (body: Progress) =>
    server.use(http.get(`${API}/me/progress`, () => HttpResponse.json(body)));

describe("ProgressMoments", () => {
    it("says XP earned, then plays a badge, then the level it reached", async () => {
        respond(
            progress({
                unseen: {
                    xp: [
                        { id: 7, source: "rate", xp: 5 },
                        { id: 8, source: "badge", xp: 50 },
                    ],
                    badges: [{ badge: "collector", metal: 1, unlockedAt: "" }],
                    tokens: 10,
                },
            })
        );
        renderWithProviders(<ProgressMoments />);
        const user = userEvent.setup({ delay: null });

        expect(await screen.findByText("Rated a game")).toBeInTheDocument();
        expect(
            screen.getByRole("dialog", { name: "Collector" })
        ).toBeInTheDocument();
        await waitFor(() =>
            expect(seen).toContainEqual({
                xpEventId: 8,
                badges: [{ badge: "collector", metal: 1 }],
            })
        );

        await user.click(screen.getByRole("button", { name: "Nice" }));
        // 120 XP, 55 of it new: from level 1 to 2.
        expect(
            await screen.findByRole("dialog", { name: "Level 2" })
        ).toBeInTheDocument();
    });

    it("plays nothing when there's nothing new", async () => {
        respond(progress());
        renderWithProviders(<ProgressMoments />);
        await waitFor(() => expect(seen).toEqual([]));
        expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("plays the launch reveal once for a member from before, and marks it", async () => {
        let revealed = 0;
        server.use(
            http.post(`${API}/me/progress/revealed`, () => {
                revealed++;
                return new HttpResponse(null, { status: 204 });
            }),
            http.get(`${API}/progress/devuser/badges`, () =>
                HttpResponse.json({
                    level: 3,
                    xp: 400,
                    frame: null,
                    held: [],
                    showcase: [],
                    layout: "row",
                    progress: [],
                })
            )
        );
        respond(progress({ reveal: true, xp: 400, level: levelFor(400) }));
        renderWithProviders(<ProgressMoments />);
        const user = userEvent.setup({ delay: null });

        expect(
            await screen.findByRole("dialog", { name: "Your history, counted" })
        ).toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Skip" }));
        await user.click(screen.getByRole("button", { name: "Done" }));
        await waitFor(() => expect(revealed).toBe(1));
    });
});
