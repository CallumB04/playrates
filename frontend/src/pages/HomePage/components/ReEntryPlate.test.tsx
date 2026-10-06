import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { buildGame, buildGameLog } from "../../../test/msw/handlers";
import { renderWithProviders } from "../../../test/renderWithProviders";
import ReEntryPlate from "./ReEntryPlate";

const base = {
    username: "devuser",
    displayName: "Kai",
    current: undefined,
    yearLogs: [],
    yearStats: undefined,
    starters: [buildGame({ id: 5, title: "Stray" })],
    shelfOf: () => null,
    onAddStarter: vi.fn(async () => undefined),
    onUpdateLog: vi.fn(),
};

describe("ReEntryPlate", () => {
    it("offers a newcomer games to add to either shelf", async () => {
        renderWithProviders(
            <ReEntryPlate {...base} isNew shelves={undefined} />
        );

        expect(
            screen.getByRole("heading", { name: "Welcome, Kai" })
        ).toBeInTheDocument();
        await userEvent.click(
            screen.getByRole("button", { name: "Add Stray to your wishlist" })
        );
        expect(base.onAddStarter).toHaveBeenCalledWith(
            base.starters[0],
            "wishlist"
        );
        expect(
            screen.getByRole("button", { name: "Add Stray to your backlog" })
        ).toBeInTheDocument();
    });

    it("says which shelf a starter is already on", () => {
        renderWithProviders(
            <ReEntryPlate
                {...base}
                isNew
                shelves={undefined}
                shelfOf={() => "wishlist"}
            />
        );

        expect(screen.getByText("On your wishlist")).toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: /to your/ })
        ).not.toBeInTheDocument();
    });

    it("shows a returning player the game on the go and their shelves", async () => {
        const onUpdateLog = vi.fn();
        renderWithProviders(
            <ReEntryPlate
                {...base}
                isNew={false}
                current={buildGameLog({ status: "playing" })}
                shelves={{ played: 12, playing: 3, backlog: 4, wishlist: 0 }}
                onUpdateLog={onUpdateLog}
            />
        );

        expect(screen.getByRole("link", { name: /12\s*$/ })).toHaveAttribute(
            "href",
            "/user/devuser?type=played"
        );
        expect(
            screen.getByRole("link", { name: "+2 more on the go" })
        ).toHaveAttribute("href", "/user/devuser?type=playing");
        await userEvent.click(screen.getByRole("button", { name: "Update" }));
        expect(onUpdateLog).toHaveBeenCalledOnce();
        expect(
            screen.queryByRole("heading", { name: "Start your shelves" })
        ).not.toBeInTheDocument();
    });
});
