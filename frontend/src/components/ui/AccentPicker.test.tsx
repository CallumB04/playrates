import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_ACCENT, PROFILE_ACCENTS } from "@playrates/shared";
import AccentPicker from "./AccentPicker";
import { accentHue } from "../../lib/profileAccent";

const setup = (
    value: Parameters<typeof AccentPicker>[0]["value"] = DEFAULT_ACCENT
) => {
    const onChange = vi.fn();
    const view = render(
        <AccentPicker label="Profile Colour" value={value} onChange={onChange} />
    );
    return { onChange, ...view };
};

describe("AccentPicker", () => {
    it("offers the whole palette", () => {
        setup();
        expect(screen.getAllByRole("radio")).toHaveLength(PROFILE_ACCENTS.length);
    });

    /* Nobody has to choose. A profile that never touched this wears the brand
       and the picker says so rather than showing nothing selected. */
    it("starts on the brand", () => {
        setup();
        expect(screen.getByRole("radio", { name: "PlayRates" })).toBeChecked();
    });

    it("reports the colour that was picked", async () => {
        const user = userEvent.setup();
        const { onChange } = setup();

        await user.click(screen.getByRole("radio", { name: "Jade" }));

        expect(onChange).toHaveBeenCalledWith("jade");
    });

    it("reports going back to the brand as a colour like any other", async () => {
        const user = userEvent.setup();
        const { onChange } = setup("jade");

        await user.click(screen.getByRole("radio", { name: "PlayRates" }));

        expect(onChange).toHaveBeenCalledWith("playrates");
    });

    it("marks the chosen one, and only that one", () => {
        setup("rose");
        expect(screen.getByRole("radio", { name: "Rose" })).toBeChecked();
        expect(
            screen.getByRole("radio", { name: "PlayRates" })
        ).not.toBeChecked();
    });

    /* A swatch drawn in anything other than the colour it applies would be a
       lie about what you are picking. */
    it("draws each swatch in the colour it stands for", () => {
        const { container } = setup();
        const swatches = container.querySelectorAll<HTMLElement>(
            "span[aria-hidden]"
        );
        PROFILE_ACCENTS.forEach((accent, i) => {
            expect(swatches[i]?.style.backgroundImage).toContain(
                `hsl(${accentHue(accent.slug)}`
            );
        });
    });

    it("is a radiogroup, so the arrow keys move between colours", () => {
        setup();
        expect(
            screen.getByRole("radiogroup", { name: "Profile Colour" })
        ).toBeInTheDocument();
    });

    /* A 28px swatch is not a touch target; the label around it is. */
    it("gives each colour a 44px label to land on", () => {
        const { container } = setup();
        for (const label of container.querySelectorAll("label")) {
            expect(label.className).toContain("size-11");
        }
    });
});
