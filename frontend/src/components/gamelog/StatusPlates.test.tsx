import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PlayedStatusSelect } from "./StatusPlates";

const trigger = () => screen.getByRole("button", { name: /how it ended/i });
const open = () => userEvent.click(trigger());
const option = (name: string) =>
    screen.getByRole("option", { name: new RegExp(name) });

describe("PlayedStatusSelect", () => {
    it("reads as just played when the log carries no substatus", () => {
        render(<PlayedStatusSelect value={null} onChange={vi.fn()} />);
        expect(trigger()).toHaveTextContent("Just played");
    });

    it("names the substatus once there is one", () => {
        render(<PlayedStatusSelect value="mastered" onChange={vi.fn()} />);
        expect(trigger()).toHaveTextContent("Mastered");
    });

    it("offers just played alongside the four real substatuses", async () => {
        render(<PlayedStatusSelect value={null} onChange={vi.fn()} />);
        await open();

        expect(screen.getAllByRole("option")).toHaveLength(5);
        for (const name of [
            "Just played",
            "Finished",
            "Mastered",
            "Shelved",
            "Retired",
        ]) {
            expect(option(name)).toBeInTheDocument();
        }
    });

    it("ticks what is already chosen", async () => {
        render(<PlayedStatusSelect value="shelved" onChange={vi.fn()} />);
        await open();

        expect(option("Shelved")).toHaveAttribute("aria-selected", "true");
        expect(option("Just played")).toHaveAttribute("aria-selected", "false");
    });

    it("ticks just played when nothing is set, rather than nothing at all", async () => {
        render(<PlayedStatusSelect value={null} onChange={vi.fn()} />);
        await open();

        expect(option("Just played")).toHaveAttribute("aria-selected", "true");
    });

    it("reports a substatus by name", async () => {
        const onChange = vi.fn();
        render(<PlayedStatusSelect value={null} onChange={onChange} />);
        await open();
        await userEvent.click(option("Retired"));

        expect(onChange).toHaveBeenCalledWith("retired");
    });

    /* Null, not a fifth status — nothing new reaches played_status, which has
       a CHECK constraint listing only the four. */
    it("reports just played as nothing at all", async () => {
        const onChange = vi.fn();
        render(<PlayedStatusSelect value="finished" onChange={onChange} />);
        await open();
        await userEvent.click(option("Just played"));

        expect(onChange).toHaveBeenCalledWith(null);
    });
});
