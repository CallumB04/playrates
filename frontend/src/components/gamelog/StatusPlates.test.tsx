import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PlayedStatusPlates } from "./StatusPlates";

const pressed = (name: string) =>
    screen.getByRole("button", { name }).getAttribute("aria-pressed");

describe("PlayedStatusPlates", () => {
    it("stands on just played when the log carries no substatus", () => {
        render(<PlayedStatusPlates value={null} onChange={vi.fn()} />);

        expect(pressed("Just played")).toBe("true");
        for (const other of ["Finished", "Mastered", "Shelved", "Retired"]) {
            expect(pressed(other)).toBe("false");
        }
    });

    it("lets go of just played once a real substatus is chosen", () => {
        render(<PlayedStatusPlates value="mastered" onChange={vi.fn()} />);

        expect(pressed("Just played")).toBe("false");
        expect(pressed("Mastered")).toBe("true");
    });

    it("reports a substatus by name", async () => {
        const onChange = vi.fn();
        render(<PlayedStatusPlates value={null} onChange={onChange} />);

        await userEvent.click(screen.getByRole("button", { name: "Shelved" }));
        expect(onChange).toHaveBeenCalledWith("shelved");
    });

    /* Null, not a fifth status — nothing new reaches played_status, which has
       a CHECK constraint listing only the four. */
    it("reports just played as nothing at all", async () => {
        const onChange = vi.fn();
        render(<PlayedStatusPlates value="finished" onChange={onChange} />);

        await userEvent.click(
            screen.getByRole("button", { name: "Just played" })
        );
        expect(onChange).toHaveBeenCalledWith(null);
    });

    it("falls back to just played when the chosen tile is pressed again", async () => {
        const onChange = vi.fn();
        render(<PlayedStatusPlates value="retired" onChange={onChange} />);

        await userEvent.click(screen.getByRole("button", { name: "Retired" }));
        expect(onChange).toHaveBeenCalledWith(null);
    });
});
