import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PROFILE_ACCENTS } from "@playrates/shared";
import AccentPicker from "./AccentPicker";
import { hueFor } from "../../lib/profileAccent";

const setup = (value: Parameters<typeof AccentPicker>[0]["value"] = null) => {
    const onChange = vi.fn();
    const view = render(
        <AccentPicker
            label="Profile colour"
            username="ada"
            value={value}
            onChange={onChange}
        />
    );
    return { onChange, ...view };
};

describe("AccentPicker", () => {
    it("offers every colour, plus the one you started with", () => {
        setup();
        expect(screen.getAllByRole("radio")).toHaveLength(
            PROFILE_ACCENTS.length + 1
        );
        expect(
            screen.getByRole("radio", { name: "Default, from your username" })
        ).toBeChecked();
    });

    it("reports the colour that was picked", async () => {
        const user = userEvent.setup();
        const { onChange } = setup();

        await user.click(screen.getByRole("radio", { name: "Jade" }));

        expect(onChange).toHaveBeenCalledWith("jade");
    });

    /* Going back to the default is a choice too, and it is null rather than a
       slug — the server reads that as "use the username again". */
    it("reports null for the default", async () => {
        const user = userEvent.setup();
        const { onChange } = setup("jade");

        await user.click(
            screen.getByRole("radio", { name: "Default, from your username" })
        );

        expect(onChange).toHaveBeenCalledWith(null);
    });

    it("marks the chosen one, and only that one", () => {
        setup("rose");
        expect(screen.getByRole("radio", { name: "Rose" })).toBeChecked();
        expect(
            screen.getByRole("radio", { name: "Default, from your username" })
        ).not.toBeChecked();
    });

    /* The default swatch is the only one whose colour is not fixed. Drawing it
       in some other colour would make it a lie. */
    it("draws the default swatch in the username's own colour", () => {
        const { container } = setup();
        const swatch = container.querySelector<HTMLElement>(
            "label:first-child span[aria-hidden]"
        );
        expect(swatch?.style.backgroundImage).toContain(`hsl(${hueFor("ada")}`);
    });

    it("is a radiogroup, so the arrow keys move between colours", () => {
        setup();
        expect(
            screen.getByRole("radiogroup", { name: "Profile colour" })
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
