import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { buildProfile } from "../../test/msw/handlers";
import AccountMenu from "./AccountMenu";

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
        expect(screen.queryByRole("menuitem", { name: /Admin/ })).not.toBeInTheDocument();
    });
});
