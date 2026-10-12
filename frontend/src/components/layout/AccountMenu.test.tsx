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

        /* The tests' matchMedia matches nothing, which is a phone; sm and
           up is put in place for the hover tests. */
        const asDesktop = () => {
            const original = window.matchMedia;
            window.matchMedia = ((query: string) => ({
                ...original(query),
                matches: true,
            })) as typeof window.matchMedia;
            return () => {
                window.matchMedia = original;
            };
        };

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

        const row = () =>
            screen.getByRole("menuitem", { name: /get started/i });

        /* The avatar stays plain: the progress lives in the menu. */
        it("leaves the avatar as it was", async () => {
            await openWith(setup);
            expect(
                screen.getByRole("button", { name: /^Account menu/ })
            ).toHaveAccessibleName("Account menu");
        });

        it("is one row until it is opened", async () => {
            await openWith(setup);
            expect(row()).toHaveTextContent("2/4");
            expect(
                screen.queryByRole("menuitem", { name: /add a friend/i })
            ).not.toBeInTheDocument();
        });

        it("opens on a tap on a phone, as places to go", async () => {
            await openWith(setup);
            await userEvent.click(row());
            expect(screen.getByText("50%")).toBeInTheDocument();
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

        /* The list has to stay open while the pointer crosses into it and
           while it is on it, or the steps could never be clicked. */
        it("opens on hover from sm, and stays open on the list", async () => {
            const restore = asDesktop();
            await openWith(setup);

            await userEvent.hover(row());
            const list = screen.getByRole("menu", { name: "Profile setup" });
            await userEvent.unhover(row());
            await userEvent.hover(list);
            await new Promise((r) => setTimeout(r, 200));
            expect(
                screen.getByRole("menuitem", { name: /add a friend/i })
            ).toBeInTheDocument();

            restore();
        });

        it("closes once the pointer leaves both", async () => {
            const restore = asDesktop();
            await openWith(setup);

            await userEvent.hover(row());
            await userEvent.unhover(row());
            await new Promise((r) => setTimeout(r, 200));
            expect(
                screen.queryByRole("menu", { name: "Profile setup" })
            ).not.toBeInTheDocument();

            restore();
        });

        /* Not dismissable: finishing it is the only way it goes. */
        it("is gone once there is nothing left", async () => {
            await openWith(null);
            expect(screen.queryByText("Get started")).not.toBeInTheDocument();
        });
    });
});
