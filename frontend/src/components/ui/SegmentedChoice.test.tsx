import { describe, expect, it } from "vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SegmentedChoice from "./SegmentedChoice";

const Tabs = () => {
    const [value, setValue] = useState<"a" | "b" | "c">("a");
    return (
        <SegmentedChoice
            label="Views"
            segments={[
                { value: "a", label: "First" },
                { value: "b", label: "Second" },
                { value: "c", label: "Third" },
            ]}
            value={value}
            onChange={setValue}
            panelId={(of) => `panel-${of}`}
        />
    );
};

describe("SegmentedChoice as tabs", () => {
    it("wires each tab to its panel, and only the chosen one takes Tab", () => {
        render(<Tabs />);

        const first = screen.getByRole("tab", { name: "First" });
        expect(first).toHaveAttribute("aria-selected", "true");
        expect(first).toHaveAttribute("aria-controls", "panel-a");
        expect(first).toHaveAttribute("tabindex", "0");
        expect(screen.getByRole("tab", { name: "Second" })).toHaveAttribute(
            "tabindex",
            "-1"
        );
    });

    it("moves with the arrows, round from either end", async () => {
        const user = userEvent.setup({ delay: null });
        render(<Tabs />);

        await user.click(screen.getByRole("tab", { name: "First" }));
        await user.keyboard("{ArrowLeft}");
        expect(screen.getByRole("tab", { name: "Third" })).toHaveFocus();
        expect(screen.getByRole("tab", { name: "Third" })).toHaveAttribute(
            "aria-selected",
            "true"
        );

        await user.keyboard("{ArrowRight}");
        expect(screen.getByRole("tab", { name: "First" })).toHaveFocus();
    });
});
