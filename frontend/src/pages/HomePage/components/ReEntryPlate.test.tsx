import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { buildGameLog } from "../../../test/msw/handlers";
import { renderWithProviders } from "../../../test/renderWithProviders";
import ReEntryPlate from "./ReEntryPlate";

const base = {
    username: "devuser",
    displayName: "Kai",
    current: undefined,
    yearLogs: [],
    yearStats: undefined,
    onUpdateLog: vi.fn(),
};

describe("ReEntryPlate", () => {
    it("welcomes a newcomer rather than back, with nothing on the go", () => {
        renderWithProviders(
            <ReEntryPlate {...base} isNew shelves={undefined} />
        );

        expect(
            screen.getByRole("heading", { name: "Welcome, Kai" })
        ).toBeInTheDocument();
        expect(screen.getByText("Nothing on the go")).toBeInTheDocument();
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
    });
});
