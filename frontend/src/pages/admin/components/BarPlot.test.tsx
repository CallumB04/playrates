import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import BarPlot from "./BarPlot";

const bars = [3, 0, 5, 2].map((value, i) => ({
    key: `d${i}`,
    segments: [{ key: "v", value, className: "bg-brand" }],
}));

const renderPlot = () =>
    render(
        <BarPlot
            bars={bars}
            label="People each day"
            describe={(i) => `Day ${i + 1}: ${bars[i]!.segments[0]!.value}`}
            axis={{ start: "first", end: "today" }}
        />
    );

describe("BarPlot", () => {
    it("reads the latest bar until told otherwise, so the readout is never empty", () => {
        renderPlot();
        const plot = screen.getByRole("slider", { name: "People each day" });
        expect(plot).toHaveAttribute("aria-valuetext", "Day 4: 2");
        expect(screen.getByText("Day 4: 2")).toBeInTheDocument();
    });

    it("steps through the bars with the arrow keys, and stops at the ends", () => {
        renderPlot();
        const plot = screen.getByRole("slider");
        fireEvent.keyDown(plot, { key: "ArrowLeft" });
        expect(plot).toHaveAttribute("aria-valuetext", "Day 3: 5");
        fireEvent.keyDown(plot, { key: "Home" });
        fireEvent.keyDown(plot, { key: "ArrowLeft" });
        expect(plot).toHaveAttribute("aria-valuetext", "Day 1: 3");
        fireEvent.keyDown(plot, { key: "End" });
        fireEvent.keyDown(plot, { key: "ArrowRight" });
        expect(plot).toHaveAttribute("aria-valuetext", "Day 4: 2");
    });

    it("goes back to the latest when focus leaves it", () => {
        renderPlot();
        const plot = screen.getByRole("slider");
        fireEvent.keyDown(plot, { key: "Home" });
        fireEvent.blur(plot);
        expect(plot).toHaveAttribute("aria-valuetext", "Day 4: 2");
    });

    it("keeps a bar for a day with nothing in it, so a gap reads as a gap", () => {
        const { container } = renderPlot();
        expect(container.querySelectorAll(".bg-strong")).toHaveLength(1);
    });
});
