import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { renderWithProviders } from "../../../test/renderWithProviders";
import ProfileNav from "./ProfileNav";

const open = (requestCount = 0) => {
    renderWithProviders(
        <Routes>
            <Route
                path="*"
                element={
                    <ProfileNav
                        username="ana"
                        active="lists"
                        counts={{ lists: 2, games: 12 }}
                        requestCount={requestCount}
                    />
                }
            />
        </Routes>,
        { route: "/user/ana/lists" }
    );
    return userEvent.setup();
};

describe("ProfileNav on a phone", () => {
    it("says which view you're on, and opens the rest to switch to", async () => {
        const u = open();
        const trigger = screen.getByRole("button", { expanded: false });
        expect(trigger).toHaveTextContent("Viewing");
        expect(trigger).toHaveTextContent("Lists");
        expect(trigger).toHaveTextContent("Switch");

        await u.click(trigger);
        const sheet = screen.getByRole("dialog");
        expect(sheet).toHaveTextContent("ana’s profile");
        expect(within(sheet).getAllByRole("link")).toHaveLength(7);
        expect(
            within(sheet).getByRole("link", { name: /Games/ })
        ).toHaveAttribute("href", "/user/ana/games");

        await u.click(within(sheet).getByRole("link", { name: /Badges/ }));
        expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("flags friend requests from another view, and on Friends in the sheet", async () => {
        const u = open(3);
        const trigger = screen.getByRole("button", { expanded: false });
        expect(trigger).toHaveTextContent("3 requests waiting");

        await u.click(trigger);
        expect(
            within(screen.getByRole("dialog")).getByRole("link", {
                name: /Friends/,
            })
        ).toHaveTextContent("3 new");
    });
});
