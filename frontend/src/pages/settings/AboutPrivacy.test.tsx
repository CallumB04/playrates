import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import {
    DEFAULT_ABOUT_VISIBILITY,
    type AboutVisibility,
} from "@playrates/shared";
import AboutPrivacy from "./AboutPrivacy";

const setup = (visibility: AboutVisibility) => {
    const onChange = vi.fn();
    render(
        <MemoryRouter>
            <AboutPrivacy
                about={{
                    firstName: "Callum",
                    website: "https://www.callum.dev/",
                }}
                visibility={visibility}
                onChange={onChange}
                onFillIn={vi.fn()}
            />
        </MemoryRouter>
    );
    return { onChange, user: userEvent.setup({ delay: null }) };
};

const pick = async (
    user: ReturnType<typeof userEvent.setup>,
    control: string,
    option: RegExp
) => {
    await user.click(screen.getByRole("button", { name: control }));
    await user.click(await screen.findByRole("option", { name: option }));
};

describe("AboutPrivacy", () => {
    it("shows each field as the card reads it, or that it isn't set", () => {
        setup(DEFAULT_ABOUT_VISIBILITY);

        expect(screen.getByText("callum.dev")).toBeInTheDocument();
        expect(
            within(
                screen.getByRole("region", { name: "About you" })
            ).getAllByText("Not set")
        ).toHaveLength(2);
    });

    it("changes one field and leaves the rest", async () => {
        const { onChange, user } = setup(DEFAULT_ABOUT_VISIBILITY);

        await pick(user, "Who sees your website", /^Only me/);

        expect(onChange).toHaveBeenCalledWith({
            ...DEFAULT_ABOUT_VISIBILITY,
            website: "private",
        });
    });

    it("offers no choice for a field that's empty", () => {
        setup(DEFAULT_ABOUT_VISIBILITY);

        expect(
            screen.queryByRole("button", { name: "Who sees your location" })
        ).toBeNull();
        expect(
            screen.getByRole("button", { name: "Who sees your name" })
        ).toBeInTheDocument();
    });

    /* Discord is empty, so its setting neither makes them Mixed nor
       changes with the rest. */
    it("sets every filled-in field at once, and says when they differ", async () => {
        const { onChange, user } = setup({
            ...DEFAULT_ABOUT_VISIBILITY,
            website: "friends",
            discord: "private",
        });

        expect(
            screen.getByRole("button", {
                name: "Who sees all your About details",
            })
        ).toHaveTextContent("Mixed");

        await pick(user, "Who sees all your About details", /^Only me/);

        expect(onChange).toHaveBeenCalledWith({
            ...DEFAULT_ABOUT_VISIBILITY,
            firstName: "private",
            website: "private",
            discord: "private",
        });
    });
});
