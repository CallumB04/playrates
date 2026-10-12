import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { GameStatus, PlayedStatus } from "../../constants/gameStatus";
import { StatusPlates } from "./StatusPlates";

const plates = (
    props: Partial<{
        value: GameStatus;
        playedStatus: PlayedStatus | null;
        onChange: (s: GameStatus) => void;
        onPlayedStatusChange: (s: PlayedStatus | null) => void;
    }> = {}
) =>
    render(
        <StatusPlates
            value="played"
            playedStatus={null}
            onChange={vi.fn()}
            onPlayedStatusChange={vi.fn()}
            {...props}
        />
    );

const endings = () => screen.queryByRole("group", { name: /how it ended/i });
const ending = (name: string) =>
    within(endings()!).getByRole("button", { name: new RegExp(name) });

describe("StatusPlates", () => {
    it("keeps the four statuses in one row", () => {
        plates({ value: "backlog" });
        for (const name of ["Played", "Playing", "Backlog", "Wishlist"]) {
            expect(screen.getByRole("button", { name })).toBeInTheDocument();
        }
    });

    it("chooses played like any other status", async () => {
        const onChange = vi.fn();
        plates({ value: "backlog", onChange });

        const plate = screen.getByRole("button", { name: "Played" });
        expect(plate).toHaveAttribute("aria-pressed", "false");
        await userEvent.click(plate);
        expect(onChange).toHaveBeenCalledWith("played");
    });

    it("shows the endings only once played is chosen", () => {
        const { rerender } = plates({ value: "playing" });
        expect(endings()).not.toBeInTheDocument();

        rerender(
            <StatusPlates
                value="played"
                playedStatus={null}
                onChange={vi.fn()}
                onPlayedStatusChange={vi.fn()}
            />
        );
        expect(endings()).toBeInTheDocument();
    });

    /* In plain sight, not behind a menu: testers never found the dropdown. */
    it("lays all four endings out at once, none chosen yet", () => {
        plates({ value: "played", playedStatus: null });

        for (const name of ["Finished", "Mastered", "Shelved", "Retired"]) {
            expect(ending(name)).toHaveAttribute("aria-pressed", "false");
        }
    });

    it("marks the chosen ending", () => {
        plates({ value: "played", playedStatus: "mastered" });
        expect(ending("Mastered")).toHaveAttribute("aria-pressed", "true");
        expect(ending("Finished")).toHaveAttribute("aria-pressed", "false");
    });

    it("reports an ending by name, without changing the status", async () => {
        const onChange = vi.fn();
        const onPlayedStatusChange = vi.fn();
        plates({ value: "played", onChange, onPlayedStatusChange });

        await userEvent.click(ending("Retired"));
        expect(onPlayedStatusChange).toHaveBeenCalledWith("retired");
        expect(onChange).not.toHaveBeenCalled();
    });

    /* Null, not a fifth status — played_status has a CHECK constraint listing
       only the four, and plain Played is a real answer. */
    it("clears the ending when the chosen one is pressed again", async () => {
        const onPlayedStatusChange = vi.fn();
        plates({
            value: "played",
            playedStatus: "finished",
            onPlayedStatusChange,
        });

        await userEvent.click(ending("Finished"));
        expect(onPlayedStatusChange).toHaveBeenCalledWith(null);
    });
});
