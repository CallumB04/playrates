import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { levelFor, type Progress } from "@playrates/shared";
import { server } from "../../test/msw/server";
import { buildProfile, buildProgress } from "../../test/msw/handlers";
import { renderWithProviders } from "../../test/renderWithProviders";
import ProgressMoments from "./ProgressMoments";
import ToastStack from "../feedback/ToastStack";

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
    it("says XP and badges in toasts, and a new level in a popup", async () => {
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
        renderWithProviders(
            <>
                <ProgressMoments />
                <ToastStack />
            </>
        );

        // The badge's own XP goes with the badge, not the XP toast.
        const xp = await screen.findByText("+5 XP: Rated a game", {
            exact: false,
        });
        // The tokens as the coin, said in words only to a screen reader.
        expect(xp).toHaveTextContent("+5 XP: Rated a game · +10tokens");
        expect(
            screen.getByText("New badge: Collector, Bronze")
        ).toBeInTheDocument();
        // 120 XP, 55 of it new: from level 1 to 2.
        expect(
            screen.getByRole("dialog", { name: "Level 2" })
        ).toBeInTheDocument();
        await waitFor(() =>
            expect(seen).toContainEqual({
                xpEventId: 8,
                badges: [{ badge: "collector", metal: 1 }],
            })
        );

        await userEvent.click(screen.getByRole("button", { name: "Nice" }));
        expect(screen.queryByRole("dialog")).toBeNull();
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
