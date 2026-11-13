import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import type { LeaderboardRow, QuestState } from "@playrates/shared";
import { buildProgress } from "../../../test/msw/handlers";
import { renderWithProviders } from "../../../test/renderWithProviders";
import { WeekCard } from "./YourWeek";

// The invite button asks who's signed in; nobody, here.
vi.mock("../../../contexts/AuthContext", () => ({
    useAuth: () => ({ user: null }),
    useUser: () => null,
}));

const quest = (overrides: Partial<QuestState>): QuestState => ({
    slot: 0,
    key: "w_rate3",
    label: "Rate 3 games",
    target: 3,
    count: 1,
    xp: 45,
    tokens: 5,
    done: false,
    swapped: false,
    ...overrides,
});

const row = (
    username: string,
    rank: number,
    isYou = false
): LeaderboardRow => ({
    username,
    avatarUrl: null,
    accent: "violet",
    level: 3,
    frame: null,
    nameFont: "default",
    nameColour: "default",
    xp: 500 - rank * 100,
    rank,
    isYou,
});

const progress = buildProgress({
    level: { level: 9, xp: 2140, floor: 1900, next: 2300, progress: 0.6 },
    streak: {
        weeks: 6,
        best: 9,
        thisWeek: true,
        freeShield: true,
        spareShields: 0,
        history: [],
    },
    quests: {
        week: [
            quest({}),
            quest({
                slot: 1,
                key: "w_review1",
                label: "Write a review",
                target: 1,
                count: 1,
                done: true,
            }),
        ],
        month: [],
        swapsLeft: 1,
    },
});

describe("WeekCard", () => {
    it("shows the streak, the longest one, the level and your place among friends", () => {
        renderWithProviders(
            <WeekCard
                username="devuser"
                progress={progress}
                board={[row("sam", 1), row("devuser", 2, true), row("kai", 3)]}
            />
        );
        expect(screen.getByText("Longest: 9 weeks")).toBeInTheDocument();
        expect(screen.getByText("160 XP to go")).toBeInTheDocument();
        expect(screen.getByText("2nd")).toBeInTheDocument();
        expect(screen.getByText("of 3 this week")).toBeInTheDocument();
    });

    it("links a task still to do, and not one that's done", () => {
        renderWithProviders(
            <WeekCard username="devuser" progress={progress} board={[]} />
        );
        expect(
            screen.getByRole("link", { name: "Rate 3 games" })
        ).toHaveAttribute("href");
        expect(
            screen.queryByRole("link", { name: "Write a review" })
        ).toBeNull();
        expect(screen.getByText("1/3")).toBeInTheDocument();
    });

    it("gives no place to someone alone on the board", () => {
        renderWithProviders(
            <WeekCard
                username="devuser"
                progress={progress}
                board={[row("devuser", 1, true)]}
            />
        );
        expect(screen.queryByText("1st")).toBeNull();
        expect(screen.getByText("–")).toBeInTheDocument();
    });

    it("waits for the board rather than calling you friendless", () => {
        renderWithProviders(
            <WeekCard
                username="devuser"
                progress={progress}
                board={undefined}
            />
        );
        expect(screen.queryByText("–")).toBeNull();
        expect(screen.queryByText(/this week/)).toBeNull();
    });

    it("says so at the top level rather than counting to a next", () => {
        renderWithProviders(
            <WeekCard
                username="devuser"
                progress={{
                    ...progress,
                    level: { ...progress.level, next: null, progress: 1 },
                }}
                board={[]}
            />
        );
        expect(screen.getByText("Top level")).toBeInTheDocument();
    });
});
