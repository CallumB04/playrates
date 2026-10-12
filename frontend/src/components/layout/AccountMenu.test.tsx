import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { buildProfile } from "../../test/msw/handlers";
import AccountMenu from "./AccountMenu";
import { pendingSetup } from "../../lib/setupChecklist";

const open = async (isAdmin: boolean) => {
    renderWithProviders(
        <AccountMenu user={buildProfile({ isAdmin })} onSignOut={() => {}} />
    );
    await userEvent.click(screen.getByRole("button", { name: "Account menu" }));
};

describe("AccountMenu", () => {
    it("offers the admin dashboard to the admin", async () => {
        await open(true);
        expect(screen.getByRole("menuitem", { name: /Admin/ })).toHaveAttribute(
            "href",
            "/admin"
        );
    });

    it("says nothing about it to anyone else", async () => {
        await open(false);
        expect(
            screen.queryByRole("menuitem", { name: /Admin/ })
        ).not.toBeInTheDocument();
    });

    describe("profile setup", () => {
        const setup = pendingSetup({
            profile: { avatarUrl: null, bio: "Hello" },
            logCount: 2,
            friendCount: 0,
        });

        const openWith = async (steps: typeof setup) => {
            renderWithProviders(
                <AccountMenu
                    user={buildProfile()}
                    onSignOut={() => {}}
                    setup={steps}
                />
            );
            await userEvent.click(
                screen.getByRole("button", { name: /^Account menu/ })
            );
        };

        it("says on the avatar how far along it is", async () => {
            await openWith(setup);
            expect(
                screen.getByRole("button", { name: /^Account menu/ })
            ).toHaveAccessibleName("Account menu, profile setup 2 of 4 done");
        });

        it("lists what is left as places to go", async () => {
            await openWith(setup);
            expect(screen.getByText("2/4")).toBeInTheDocument();
            expect(
                screen.getByRole("menuitem", { name: /add a profile picture/i })
            ).toHaveAttribute("href", "/settings?section=profile");
            expect(
                screen.getByRole("menuitem", { name: /add a friend/i })
            ).toHaveAttribute("href", "/community");
            // Done steps stay on the list, but are not somewhere to go.
            expect(
                screen.queryByRole("menuitem", { name: /write a bio/i })
            ).not.toBeInTheDocument();
        });

        /* Not dismissable: finishing it is the only way it goes. */
        it("is gone once there is nothing left", async () => {
            await openWith(null);
            expect(
                screen.queryByText("Set up your profile")
            ).not.toBeInTheDocument();
        });
    });
});
