import { describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../test/msw/server";
import { buildGameLog, buildLogBundle } from "../test/msw/handlers";
import { renderWithProviders } from "../test/renderWithProviders";
import { LogFlowProvider } from "./gamelog/LogFlow";
import ViewGameLogPopup from "./ViewGameLogPopup";

// Signed out: someone else's logs, read only.
vi.mock("../contexts/AuthContext", () => ({
    useAuth: () => ({ user: null }),
    useUser: () => null,
}));

const API = "http://localhost:3000/api/v1";

const twoConsoles = () =>
    server.use(
        http.get(`${API}/users/:username/logs`, () =>
            HttpResponse.json(
                buildLogBundle([
                    buildGameLog({ id: 1, system: "steam", rating: 9 }),
                    buildGameLog({
                        id: 2,
                        system: null,
                        platform: null,
                        rating: 6,
                    }),
                ])
            )
        )
    );

const open = () =>
    renderWithProviders(
        <LogFlowProvider>
            <ViewGameLogPopup
                gameId={1}
                ownerUsername="kai"
                onClose={() => {}}
            />
        </LogFlowProvider>
    );

describe("ViewGameLogPopup, a game on more than one console", () => {
    it("opens on the totals, with a tab per console", async () => {
        twoConsoles();
        open();

        const tabs = await screen.findByRole("tablist", { name: "Platforms" });
        expect(within(tabs).getAllByRole("tab")).toHaveLength(3);
        expect(within(tabs).getByRole("tab", { name: "All" })).toHaveAttribute(
            "aria-selected",
            "true"
        );
        expect(screen.getByText("Their average of 2")).toBeInTheDocument();
    });

    it("shows one console's log on its own tab", async () => {
        twoConsoles();
        open();

        await userEvent.click(
            await screen.findByRole("tab", { name: "No platform" })
        );

        expect(screen.getByText("Their rating")).toBeInTheDocument();
        expect(
            screen.queryByText("Their average of 2")
        ).not.toBeInTheDocument();
    });
});
