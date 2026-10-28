import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { badgeDef, type BadgeDef } from "@playrates/shared";
import BadgeTip from "./BadgeTip";

const collector = badgeDef("collector") as BadgeDef;

describe("BadgeTip", () => {
    it("says what the badge is, how far to the next metal, and how rare", async () => {
        render(
            <BadgeTip badge={collector} metal={2} rarity={0.12} value={60} />
        );
        expect(screen.queryByRole("tooltip")).toBeNull();

        await userEvent.click(
            screen.getByRole("button", { name: "Collector, Silver" })
        );

        const tip = screen.getByRole("tooltip");
        expect(tip).toHaveTextContent("Log 50 games");
        expect(tip).toHaveTextContent("To Gold");
        expect(tip).toHaveTextContent("60 / 150");
        expect(tip).toHaveTextContent("12% of members");
    });

    it("leaves out progress it hasn't been given: someone else's", async () => {
        render(<BadgeTip badge={collector} metal={2} rarity={0.12} />);
        await userEvent.hover(
            screen.getByRole("button", { name: "Collector, Silver" })
        );
        expect(await screen.findByRole("tooltip")).not.toHaveTextContent(
            "To Gold"
        );
    });
});
