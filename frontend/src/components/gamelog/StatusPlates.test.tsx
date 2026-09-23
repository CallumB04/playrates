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

const played = () => screen.getByRole("button", { name: /how it ended/i });
const option = (name: string) =>
    screen.getByRole("option", { name: new RegExp(name) });

describe("StatusPlates", () => {
    it("keeps the four statuses in one row", () => {
        plates({ value: "backlog" });
        for (const name of ["Played", "Playing", "Backlog", "Wishlist"]) {
            expect(screen.getByRole("button", { name })).toBeInTheDocument();
        }
    });

    it("leaves played a plain plate until it is the chosen status", async () => {
        const onChange = vi.fn();
        plates({ value: "backlog", onChange });

        const plate = screen.getByRole("button", { name: "Played" });
        expect(plate).toHaveAttribute("aria-pressed", "false");
        expect(plate).not.toHaveAttribute("aria-haspopup");

        await userEvent.click(plate);
        expect(onChange).toHaveBeenCalledWith("played");
    });

    it("opens in place once played is chosen", () => {
        plates({ value: "played" });

        expect(played()).toHaveAttribute("aria-haspopup", "listbox");
        expect(played()).toHaveTextContent("Played");
    });

    it("rests on plain played, with the four refinements under it", async () => {
        plates({ value: "played", playedStatus: null });
        await userEvent.click(played());

        expect(screen.getAllByRole("option")).toHaveLength(5);
        expect(option("^Played")).toHaveAttribute("aria-selected", "true");
        for (const name of ["Finished", "Mastered", "Shelved", "Retired"]) {
            expect(option(name)).toHaveAttribute("aria-selected", "false");
        }
    });

    it("names the substatus on the plate once there is one", () => {
        plates({ value: "played", playedStatus: "mastered" });
        expect(played()).toHaveTextContent("Mastered");
    });

    it("reports a substatus by name", async () => {
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

    it("does not change the status when the open plate is used", async () => {
        const onChange = vi.fn();
        plates({ value: "played", onChange });

        await userEvent.click(played());
        await userEvent.click(option("Shelved"));
        expect(onChange).not.toHaveBeenCalled();
    });
});
