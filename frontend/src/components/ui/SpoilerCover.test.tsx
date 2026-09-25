import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SpoilerCover from "./SpoilerCover";

describe("SpoilerCover", () => {
    it("hides a spoiler until it is asked for, then keeps it shown", async () => {
        render(
            <SpoilerCover covered revealLabel="Show review">
                <p>The king was the ghost.</p>
            </SpoilerCover>
        );

        expect(screen.queryByText("The king was the ghost.")).toBeNull();
        await userEvent.click(
            screen.getByRole("button", { name: /Show review/ })
        );

        expect(screen.getByText("The king was the ghost.")).toBeInTheDocument();
        expect(screen.queryByRole("button")).toBeNull();
    });

    it("shows what is not a spoiler with no cover", () => {
        render(
            <SpoilerCover covered={false} revealLabel="Show review">
                <p>Great game.</p>
            </SpoilerCover>
        );

        expect(screen.getByText("Great game.")).toBeInTheDocument();
        expect(screen.queryByRole("button")).toBeNull();
    });
});
