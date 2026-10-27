import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useLocation } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "../../../test/msw/server";
import { renderWithProviders } from "../../../test/renderWithProviders";
import GamesView from "./GamesView";

vi.mock("../lib/useShelfTileActions", () => ({
    useShelfTileActions: () => ({ buildTileActions: () => [] }),
}));

const API = "http://localhost:3000/api/v1";

let shelfAsked: URLSearchParams | null;

beforeEach(() => {
    shelfAsked = null;
    server.use(
        http.get(`${API}/users/:username/shelf`, ({ request }) => {
            shelfAsked = new URL(request.url).searchParams;
            return HttpResponse.json({
                data: [],
                meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
            });
        }),
        http.get(`${API}/users/:username/shelf/consoles`, () =>
            HttpResponse.json(["playstation5", "steam"])
        ),
        http.get(`${API}/platforms/systems`, () =>
            HttpResponse.json({
                data: [
                    {
                        slug: "steam",
                        displayName: "Steam",
                        platformSlug: "steam",
                        sortOrder: 10,
                    },
                    {
                        slug: "playstation5",
                        displayName: "PlayStation 5",
                        platformSlug: "playstation",
                        sortOrder: 20,
                    },
                ],
            })
        )
    );
});

const Search = () => <output>{useLocation().search}</output>;

const setup = (route: string) => {
    renderWithProviders(
        <>
            <GamesView
                username="devuser"
                isMyAccount
                stats={undefined}
                canSee
            />
            <Search />
        </>,
        { route }
    );
    return userEvent.setup({ delay: null });
};

const search = () =>
    new URLSearchParams(screen.getByRole("status").textContent!);

describe("GamesView's filters", () => {
    it("puts the console in the URL and starts the shelf again", async () => {
        const user = setup("/user/devuser/games?type=played&page=2");

        await user.click(
            await screen.findByRole("button", { name: /Filters/ })
        );
        // The menu is portalled out of the popover; picking in it must not
        // close the popover before the pick lands.
        await user.click(screen.getByRole("button", { name: "Console" }));
        await user.click(
            await screen.findByRole("option", { name: /PlayStation 5/ })
        );

        expect(search().get("console")).toBe("playstation5");
        expect(search().get("page")).toBeNull();
        await waitFor(() =>
            expect(shelfAsked?.get("system")).toBe("playstation5")
        );
    });

    it("lets go of the console on another shelf, which has its own", async () => {
        const user = setup("/user/devuser/games?type=played&console=steam");

        await user.click(await screen.findByRole("tab", { name: /Backlog/ }));

        expect(search().get("type")).toBe("backlog");
        expect(search().get("console")).toBeNull();
    });

    it("clears the ending and the console together", async () => {
        const user = setup(
            "/user/devuser/games?type=played&ending=finished&console=steam"
        );

        await user.click(
            await screen.findByRole("button", { name: "Filters, 2 on" })
        );
        await user.click(screen.getByRole("button", { name: "Clear" }));

        expect(search().get("ending")).toBeNull();
        expect(search().get("console")).toBeNull();
        expect(search().get("type")).toBe("played");
    });

    it("closes on a press outside, but not on a pick inside", async () => {
        const user = setup("/user/devuser/games?type=played");

        await user.click(
            await screen.findByRole("button", { name: /Filters/ })
        );
        await user.click(screen.getByRole("button", { name: "How it ended" }));
        await user.click(
            await screen.findByRole("option", { name: /Finished/ })
        );
        expect(screen.getByRole("dialog")).toBeInTheDocument();

        await user.click(document.body);
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
});
