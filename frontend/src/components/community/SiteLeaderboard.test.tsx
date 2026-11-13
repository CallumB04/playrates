import { describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type {
    LeaderboardRow,
    SiteLeaderboard as Board,
} from "@playrates/shared";
import { server } from "../../test/msw/server";
import { renderWithProviders } from "../../test/renderWithProviders";
import SiteLeaderboard from "./SiteLeaderboard";

vi.mock("../../contexts/AuthContext", () => ({
    useAuth: () => ({ user: { id: "me" }, isLoading: false }),
    useUser: () => null,
}));

const API = "http://localhost:3000/api/v1";

const row = (
    username: string,
    rank: number,
    xp: number,
    isYou = false
): LeaderboardRow => ({
    username,
    avatarUrl: null,
    accent: "violet",
    level: 4,
    frame: null,
    nameFont: "default",
    nameColour: "default",
    xp,
    rank,
    isYou,
});

const serve = (boards: Partial<Record<string, Board>>) => {
    const asked: string[] = [];
    server.use(
        http.get(`${API}/progress/leaderboard`, ({ request }) => {
            const period = new URL(request.url).searchParams.get("period")!;
            asked.push(period);
            return HttpResponse.json(boards[period] ?? { rows: [], total: 0 });
        })
    );
    return asked;
};

const top = [1, 2, 3, 4, 5].map((n) => row(`p${n}`, n, 600 - n * 50));

describe("SiteLeaderboard", () => {
    it("shows the top, a break, then you among your neighbours", async () => {
        serve({
            week: {
                rows: [
                    ...top,
                    row("p8", 8, 120),
                    row("me", 9, 110, true),
                    row("p10", 10, 90),
                ],
                total: 40,
            },
        });
        renderWithProviders(<SiteLeaderboard />);

        const you = await screen.findByRole("link", { name: /You/ });
        expect(you).toHaveAttribute("href", "/user/me");
        expect(you).toHaveTextContent("110 XP");
        expect(screen.getByText("40 players")).toBeInTheDocument();
        // Five, the break, then three: the break isn't a place.
        const items = within(screen.getByRole("list")).getAllByRole("listitem");
        expect(items).toHaveLength(8);
    });

    it("keeps a private player's place without naming or linking them", async () => {
        serve({
            week: {
                rows: [
                    { hidden: true, rank: 1, xp: 900, isYou: false },
                    ...top.slice(1),
                ],
                total: 5,
            },
        });
        renderWithProviders(<SiteLeaderboard />);
        const hidden = await screen.findByText("Private player");
        expect(hidden.closest("a")).toBeNull();
        expect(hidden.parentElement).toHaveTextContent("1Private player900 XP");
    });

    it("keeps the break under the top when you're sixth", async () => {
        serve({
            week: {
                rows: [...top, row("me", 6, 240, true), row("p7", 7, 230)],
                total: 7,
            },
        });
        const { container } = renderWithProviders(<SiteLeaderboard />);
        await screen.findByRole("link", { name: /You/ });
        const items = container.querySelectorAll("li");
        expect(items[5]).toHaveAttribute("aria-hidden");
    });

    it("runs on without a break when you're in the top", async () => {
        serve({
            week: {
                rows: [row("me", 1, 700, true), ...top.slice(1)],
                total: 5,
            },
        });
        const { container } = renderWithProviders(<SiteLeaderboard />);
        await screen.findByRole("link", { name: /You/ });
        expect(container.querySelector("li[aria-hidden]")).toBeNull();
    });

    it("asks for the month's board when the month is picked", async () => {
        const asked = serve({
            week: { rows: top, total: 5 },
            month: { rows: [row("monthly", 1, 900)], total: 1 },
        });
        renderWithProviders(<SiteLeaderboard />);
        await screen.findByRole("link", { name: /p1/ });

        await userEvent.click(screen.getByRole("radio", { name: "Month" }));
        expect(
            await screen.findByRole("link", { name: /monthly/ })
        ).toBeInTheDocument();
        expect(asked).toEqual(["week", "month"]);
    });

    it("says nobody's earned anything rather than ranking you alone at nought", async () => {
        serve({ week: { rows: [row("me", 1, 0, true)], total: 1 } });
        renderWithProviders(<SiteLeaderboard />);
        expect(
            await screen.findByText("Nobody’s earned XP this week yet.")
        ).toBeInTheDocument();
        expect(screen.queryByRole("link", { name: /You/ })).toBeNull();
    });

    it("steps aside when the board won't load", async () => {
        server.use(
            http.get(`${API}/progress/leaderboard`, () =>
                HttpResponse.json({ error: { code: "x" } }, { status: 500 })
            )
        );
        const { container } = renderWithProviders(<SiteLeaderboard />);
        await vi.waitFor(() => expect(container).toBeEmptyDOMElement());
    });
});
