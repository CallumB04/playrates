import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import RatingBadge from "./RatingBadge";

describe("RatingBadge", () => {
    it("always shows two decimals, so a column of them lines up", () => {
        const { container } = render(<RatingBadge value={9} />);
        expect(container.firstChild).toHaveTextContent("9.00/10");
    });

    it("keeps the shape when there is no rating", () => {
        const { container } = render(<RatingBadge value={null} />);
        expect(container.firstChild).toHaveTextContent("—/10");
    });

    it("reserves brand ink for a real rating", () => {
        const { rerender, container } = render(<RatingBadge value={8.25} />);
        expect(container.firstChild).toHaveClass("text-brand");

        rerender(<RatingBadge value={null} />);
        expect(container.firstChild).toHaveClass("text-content-muted");
        expect(container.firstChild).not.toHaveClass("text-brand");
    });

    it("sets the scale suffix smaller and muted at every size", () => {
        for (const size of ["sm", "md", "lg"] as const) {
            const { container, unmount } = render(
                <RatingBadge value={7.5} size={size} />
            );
            const suffix = container.querySelector("span span");
            expect(suffix).toHaveTextContent("/10");
            expect(suffix).toHaveClass("text-content-muted");
            unmount();
        }
    });

    it("takes a class from the caller without losing its own", () => {
        const { container } = render(
            <RatingBadge value={5} className="shrink-0" />
        );
        expect(container.firstChild).toHaveClass("shrink-0", "font-mono");
    });
});
