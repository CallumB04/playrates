import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Progress from "./Progress";

describe("Progress", () => {
    it("reports a value as a percentage", () => {
        render(<Progress value={0.42} label="Achievements earned" />);
        const bar = screen.getByRole("progressbar", {
            name: "Achievements earned",
        });
        expect(bar).toHaveAttribute("aria-valuenow", "42");
    });

    /* Hours against the longest of two, a share of logs — a caller can hand
       in a ratio past either end, and the bar must not spill out of its track. */
    it("clamps a value outside 0–1", () => {
        const { rerender } = render(<Progress value={1.7} label="Over" />);
        expect(screen.getByRole("progressbar")).toHaveAttribute(
            "aria-valuenow",
            "100"
        );
        rerender(<Progress value={-0.2} label="Under" />);
        expect(screen.getByRole("progressbar")).toHaveAttribute(
            "aria-valuenow",
            "0"
        );
    });

    it("fills in the colour it is given", () => {
        const { container } = render(
            <Progress
                value={0.5}
                label="Time to beat"
                fillClassName="bg-strong"
            />
        );
        const fill = container.querySelector("[role=progressbar] > span")!;
        expect(fill.className).toContain("bg-strong");
        expect(fill.className).not.toContain("bg-brand");
    });

    /* A shelf split by status is a picture of proportions, not a task under
       way, so it isn't announced as progress. */
    it("draws a breakdown as an image of its parts", () => {
        const { container } = render(
            <Progress
                label="Played: 3, Playing: 1"
                segments={[
                    { key: "played", value: 0.75, className: "bg-a" },
                    { key: "playing", value: 0.25, className: "bg-b" },
                    { key: "backlog", value: 0, className: "bg-c" },
                ]}
            />
        );
        expect(
            screen.getByRole("img", { name: "Played: 3, Playing: 1" })
        ).toBeInTheDocument();
        expect(screen.queryByRole("progressbar")).toBeNull();

        const parts = container.querySelectorAll("[role=img] > span");
        expect(parts).toHaveLength(2);
        expect((parts[0] as HTMLElement).style.width).toBe("75%");
    });

    it("sweeps when there is no value to show", () => {
        render(<Progress label="Loading" />);
        expect(screen.getByRole("progressbar")).not.toHaveAttribute(
            "aria-valuenow"
        );
    });
});
