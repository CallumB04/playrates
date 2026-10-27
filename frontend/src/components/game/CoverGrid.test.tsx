import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import CoverGrid from "./CoverGrid";

describe("CoverGrid", () => {
    it("always draws four places, the empty ones as wells", () => {
        const { container } = render(
            <CoverGrid
                covers={[
                    { id: 1, title: "One", coverUrl: "https://img/1.jpg" },
                    { id: 2, title: "Two", coverUrl: "https://img/2.jpg" },
                ]}
            />
        );
        const grid = container.firstElementChild!;

        expect(grid.children).toHaveLength(4);
        expect(grid.querySelectorAll("img")).toHaveLength(2);
    });
});
