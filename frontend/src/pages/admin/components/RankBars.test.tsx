import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RankBars from "./RankBars";

const renderRanks = (values: number[]) =>
    render(
        <MemoryRouter>
            <RankBars
                unit={["log", "logs"]}
                items={values.map((value, i) => ({
                    key: String(i),
                    label: `Game ${i + 1}`,
                    value,
                    href: `/game/${i}`,
                }))}
            />
        </MemoryRouter>
    );

describe("RankBars", () => {
    it("measures every bar against the leader", () => {
        const { container } = renderRanks([4, 2, 1]);
        const widths = [
            ...container.querySelectorAll<HTMLElement>("[style]"),
        ].map((e) => e.style.width);
        expect(widths).toEqual(["100%", "50%", "25%"]);
    });

    it("marks everyone level with the leader as leading, not just the first", () => {
        const { container } = renderRanks([1, 1, 1]);
        expect(container.querySelectorAll(".bg-brand")).toHaveLength(3);
    });

    it("links each row, with the unit agreeing with its count", () => {
        renderRanks([2, 1]);
        expect(
            screen.getByRole("link", { name: /Game 1.*2 logs/ })
        ).toHaveAttribute("href", "/game/0");
        expect(
            screen.getByRole("link", { name: /Game 2.*1 log$/ })
        ).toBeInTheDocument();
    });
});
