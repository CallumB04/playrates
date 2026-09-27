import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import InsightCard from "./InsightCard";

describe("InsightCard", () => {
    it("opens from one button named for the figure, not for everything inside", () => {
        const onOpen = vi.fn();
        render(
            <InsightCard
                label="New sign-ups · last 30 days"
                value="3"
                onOpen={onOpen}
            >
                <p>chart</p>
            </InsightCard>
        );
        const buttons = screen.getAllByRole("button");
        expect(buttons).toHaveLength(1);
        fireEvent.click(
            screen.getByRole("button", { name: "Open new sign-ups" })
        );
        expect(onOpen).toHaveBeenCalledOnce();
    });
});
