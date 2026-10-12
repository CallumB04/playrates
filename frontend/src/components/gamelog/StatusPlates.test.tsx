import { render, screen } from "@testing-library/react";
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

const played = () => screen.getByRole("button", { name: /^Played/ });
const option = (name: string) =>
    screen.getByRole("option", { name: new RegExp(name) });

describe("StatusPlates", () => {
    it("keeps the four statuses in one row", () => {
        plates({ value: "backlog" });
        for (const name of ["Played", "Playing", "Backlog", "Wishlist"]) {
            expect(screen.getByRole("button", { name })).toBeInTheDocument();
        }
    });

    /* As a plain plate until chosen, testers never found the endings. */
    it("is a menu even before played is chosen", () => {
        plates({ value: "backlog" });
        expect(played()).toHaveAttribute("aria-haspopup", "listbox");
    });

    it("chooses played and opens the endings in one press", async () => {
        const onChange = vi.fn();
        plates({ value: "backlog", onChange });

        await userEvent.click(played());
        expect(onChange).toHaveBeenCalledWith("played");
        expect(screen.getAllByRole("option")).toHaveLength(5);
    });

    /* Ticked, so leaving it there is plainly an answer. */
    it("opens on plain played, with the four endings beside it", async () => {
        plates({ value: "played", playedStatus: null });
        await userEvent.click(played());

        expect(option("^Played")).toHaveAttribute("aria-selected", "true");
        for (const name of ["Finished", "Mastered", "Shelved", "Retired"]) {
            expect(option(name)).toHaveAttribute("aria-selected", "false");
        }
    });

    it("leaves the status alone when it is already played", async () => {
        const onChange = vi.fn();
        plates({ value: "played", onChange });

        await userEvent.click(played());
        await userEvent.click(option("Shelved"));
        expect(onChange).not.toHaveBeenCalled();
    });

    it("names the ending on the plate once there is one", () => {
        plates({ value: "played", playedStatus: "mastered" });
        expect(played()).toHaveTextContent("Mastered");
        expect(played()).toHaveAccessibleName("Played, Mastered");
    });

    /* The plate wears the chosen ending, so it reads as the badge that log
       will carry. Lucide names its own marks, which is the one part of the
       presentation worth pinning; the hues are class strings, not behaviour. */
    it("wears the ending's mark rather than the played one", () => {
        const { rerender } = plates({ value: "played", playedStatus: null });
        expect(played().querySelector("svg")).toHaveClass(
            "lucide-circle-check"
        );

        rerender(
            <StatusPlates
                value="played"
                playedStatus="retired"
                onChange={vi.fn()}
                onPlayedStatusChange={vi.fn()}
            />
        );
        expect(played().querySelector("svg")).toHaveClass("lucide-archive");
    });

    it("reports an ending by name", async () => {
        const onPlayedStatusChange = vi.fn();
        plates({ value: "played", onPlayedStatusChange });

        await userEvent.click(played());
        await userEvent.click(option("Retired"));
        expect(onPlayedStatusChange).toHaveBeenCalledWith("retired");
    });

    /* Null, not a fifth status — nothing new reaches played_status, which has
       a CHECK constraint listing only the four. */
    it("reports plain played as nothing at all", async () => {
        const onPlayedStatusChange = vi.fn();
        plates({
            value: "played",
            playedStatus: "finished",
            onPlayedStatusChange,
        });

        await userEvent.click(played());
        await userEvent.click(option("^Played"));
        expect(onPlayedStatusChange).toHaveBeenCalledWith(null);
    });
});
