import { describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import type { AwardLeaderboard } from "@playrates/shared";
import { renderWithProviders } from "../../../test/renderWithProviders";
import LeaderboardPopup from "./LeaderboardPopup";

const person = (username: string, isYou = false) => ({
    username,
    avatarUrl: null,
    accent: "violet",
    isYou,
});

const board: AwardLeaderboard = {
    tiers: [
        { called: 5, players: 1, people: [person("copperpot")] },
        {
            called: 4,
            players: 9,
            people: [
                person("ambergris"),
                person("blackthorn"),
                { hidden: true },
            ],
        },
        { called: 3, players: 14, people: [person("me", true)] },
    ],
    total: 40,
    decided: 6,
    categories: 6,
    you: { called: 3, rank: 11 },
};

describe("LeaderboardPopup", () => {
    it("gives each score one line, however many tied on it", () => {
        renderWithProviders(
            <LeaderboardPopup board={board} onClose={vi.fn()} />
        );
        const lines = screen.getAllByRole("listitem");
        expect(lines).toHaveLength(3);
        expect(lines[1]).toHaveTextContent(
            "ambergris, blackthorn and 7 others"
        );
        expect(screen.getByText("40 players")).toBeInTheDocument();
    });

    it("marks your score as yours", () => {
        renderWithProviders(
            <LeaderboardPopup board={board} onClose={vi.fn()} />
        );
        const yours = screen.getAllByRole("listitem")[2]!;
        expect(
            within(yours).getByText("You and 13 others")
        ).toBeInTheDocument();
    });

    it("says how many winners are in while the night is still going", () => {
        renderWithProviders(
            <LeaderboardPopup
                board={{ ...board, decided: 4, categories: 29 }}
                onClose={vi.fn()}
            />
        );
        expect(
            screen.getByText("40 players · 4 of 29 winners in so far")
        ).toBeInTheDocument();
    });
});
