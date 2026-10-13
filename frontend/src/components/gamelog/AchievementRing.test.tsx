import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import AchievementRing from "./AchievementRing";

describe("AchievementRing", () => {
    it("rounds the share to a whole percent, and caps it at 100", () => {
        const { rerender } = render(<AchievementRing done={27} total={60} />);
        expect(screen.getByText("45%")).toBeInTheDocument();

        rerender(<AchievementRing done={61} total={60} />);
        expect(screen.getByText("100%")).toBeInTheDocument();

        rerender(<AchievementRing done={0} total={0} />);
        expect(screen.getByText("0%")).toBeInTheDocument();
    });

    /* A CSS drop-shadow drew only a tenth past the arc's box, and the svg
       clipped the rest: the glow ended in a visible square. */
    it("gives the glow room to fade out on every side", () => {
        const { container } = render(<AchievementRing done={3} total={52} />);
        const svg = container.querySelector("svg")!;
        const arc = svg.querySelectorAll("circle")[1];
        const filter = svg.querySelector("filter")!;

        expect(svg).toHaveClass("overflow-visible");
        expect(arc.getAttribute("style") ?? "").not.toContain("drop-shadow");
        expect(arc).toHaveAttribute("filter", `url(#${filter.id})`);
        expect(filter).toHaveAttribute("filterUnits", "userSpaceOnUse");

        // The arc reaches 2..78 of the 80 box; the region has to clear that.
        const x = Number(filter.getAttribute("x"));
        const width = Number(filter.getAttribute("width"));
        expect(x).toBeLessThan(0);
        expect(x + width).toBeGreaterThan(80);
    });
});
