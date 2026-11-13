import { useState } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HypeMeter from "./HypeMeter";

const Harness = ({ start = null }: { start?: number | null }) => {
    const [value, setValue] = useState<number | null>(start);
    return (
        <>
            <HypeMeter value={value} onChange={setValue} gameTitle="Hades II" />
            <output>{value ?? "none"}</output>
        </>
    );
};

describe("HypeMeter", () => {
    it("asks about the game by name", () => {
        render(<Harness />);
        expect(
            screen.getByRole("slider", {
                name: "How hyped are you to play Hades II?",
            })
        ).toBeInTheDocument();
    });

    it("lights up to the flame pressed", async () => {
        render(<Harness />);
        await userEvent.click(
            screen.getByRole("button", { name: "4 of 5 flames" })
        );
        expect(screen.getByRole("status")).toHaveTextContent("4");
        expect(screen.getByRole("slider")).toHaveAttribute(
            "aria-valuetext",
            "4 of 5 flames"
        );
    });

    it("puts them out when the same flame is pressed again", async () => {
        render(<Harness start={3} />);
        await userEvent.click(
            screen.getByRole("button", { name: "3 of 5 flames" })
        );
        expect(screen.getByRole("status")).toHaveTextContent("none");
    });

    it("moves with the arrow keys, and clears with Delete", async () => {
        render(<Harness />);
        screen.getByRole("slider").focus();
        await userEvent.keyboard("{ArrowRight}{ArrowRight}");
        expect(screen.getByRole("status")).toHaveTextContent("2");
        await userEvent.keyboard("{End}");
        expect(screen.getByRole("status")).toHaveTextContent("5");
        await userEvent.keyboard("{ArrowLeft}");
        expect(screen.getByRole("status")).toHaveTextContent("4");
        await userEvent.keyboard("{Delete}");
        expect(screen.getByRole("status")).toHaveTextContent("none");
    });

    it("goes out rather than below one flame", async () => {
        render(<Harness start={1} />);
        screen.getByRole("slider").focus();
        await userEvent.keyboard("{ArrowLeft}");
        expect(screen.getByRole("status")).toHaveTextContent("none");
    });
});
