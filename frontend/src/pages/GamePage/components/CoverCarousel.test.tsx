import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CoverCarousel from "./CoverCarousel";

const covers = [
    { url: "https://example.test/main.jpg", label: null },
    { url: "https://example.test/complete.jpg", label: "Complete Edition" },
    { url: "https://example.test/jp.jpg", label: "Japan" },
];

describe("CoverCarousel", () => {
    it("is just the cover when there is only one", () => {
        render(<CoverCarousel covers={covers.slice(0, 1)} title="Witcher" />);

        expect(
            screen.getByRole("img", { name: "Witcher" })
        ).toBeInTheDocument();
        expect(screen.queryByRole("button")).toBeNull();
        expect(screen.queryByText(/of/)).toBeNull();
    });

    it("names each cover for screen readers by what it is", () => {
        render(<CoverCarousel covers={covers} title="Witcher" />);

        expect(
            screen.getByRole("img", { name: "Witcher, Complete Edition" })
        ).toBeInTheDocument();
    });

    it("pages through the covers, saying which one is showing", async () => {
        render(<CoverCarousel covers={covers} title="Witcher" />);
        const previous = screen.getByRole("button", { name: "Previous cover" });
        const next = screen.getByRole("button", { name: "Next cover" });

        expect(screen.getByText("Main cover · 1 of 3")).toBeInTheDocument();
        expect(previous).toBeDisabled();

        await userEvent.click(next);
        expect(
            screen.getByText("Complete Edition · 2 of 3")
        ).toBeInTheDocument();

        await userEvent.click(next);
        expect(screen.getByText("Japan · 3 of 3")).toBeInTheDocument();
        expect(next).toBeDisabled();
    });
});
