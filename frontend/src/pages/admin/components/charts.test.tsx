import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import Heatmap from "./Heatmap";
import LinePlot from "./LinePlot";

describe("Heatmap", () => {
    // A Wednesday start, so the first column is padded by two.
    const days = ["2026-09-16", "2026-09-17", "2026-09-18", "2026-09-19", "2026-09-20", "2026-09-21", "2026-09-22", "2026-09-23", "2026-09-24"].map(
        (day, i) => ({ day, value: i % 3 })
    );
    const renderMap = () =>
        render(<Heatmap days={days} label="Daily use" describe={(d) => `${d.day}: ${d.value}`} />);

    it("reads the latest day until told otherwise", () => {
        renderMap();
        expect(screen.getByRole("slider")).toHaveAttribute("aria-valuetext", "2026-09-24: 2");
    });

    it("steps a day with up and down, and a week with left and right", () => {
        renderMap();
        const map = screen.getByRole("slider");
        fireEvent.keyDown(map, { key: "ArrowUp" });
        expect(map).toHaveAttribute("aria-valuetext", "2026-09-23: 1");
        fireEvent.keyDown(map, { key: "ArrowLeft" });
        expect(map).toHaveAttribute("aria-valuetext", "2026-09-16: 0");
    });

    it("pads the first week so every row stays one weekday", () => {
        const { container } = renderMap();
        // seven weekday labels, two blanks for Monday and Tuesday, nine days
        expect(container.querySelector("[role=slider]")!.children).toHaveLength(7 + 2 + 9);
    });
});

describe("LinePlot", () => {
    it("reads the latest point, and steps back with the arrow keys", () => {
        render(
            <LinePlot
                series={[{ key: "a", label: "People", values: [1, 4, 2], color: "red" }]}
                label="People each day"
                describe={(i) => `Day ${i + 1}`}
            />
        );
        const plot = screen.getByRole("slider", { name: "People each day" });
        expect(plot).toHaveAttribute("aria-valuetext", "Day 3");
        fireEvent.keyDown(plot, { key: "ArrowLeft" });
        expect(plot).toHaveAttribute("aria-valuetext", "Day 2");
    });
});
