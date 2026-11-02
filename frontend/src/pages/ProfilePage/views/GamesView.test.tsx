import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useLocation } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "../../../test/msw/server";
import { renderWithProviders } from "../../../test/renderWithProviders";
import GamesView from "./GamesView";

// The viewer's own logged games, as "in common" weighs a shelf against.
let mine: Set<number> | undefined;

vi.mock("../lib/useShelfTileActions", () => ({
    useShelfTileActions: () => ({
        buildTileActions: () => [],
        myLogGameIds: mine,
    }),
}));

const API = "http://localhost:3000/api/v1";

let shelfAsked: URLSearchParams | null;

beforeEach(() => {
    shelfAsked = null;
    mine = undefined;
    server.use(
        http.get(`${API}/users/:username/shelf/genres`, () =>
            HttpResponse.json(["adventure", "role-playing-rpg"])
        ),
        http.get(`${API}/genres`, () =>
            HttpResponse.json({
                data: [
                    { slug: "adventure", name: "Adventure" },
                    { slug: "puzzle", name: "Puzzle" },
                    { slug: "role-playing-rpg", name: "Role-playing (RPG)" },
                ],
            })
        ),
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

const setup = (route: string, isMyAccount = true) => {
    renderWithProviders(
        <>
            <GamesView
                username="devuser"
                isMyAccount={isMyAccount}
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
    it("puts the platform in the URL and starts the shelf again", async () => {
        const user = setup("/user/devuser/games?type=played&page=2");

        await user.click(
            await screen.findByRole("button", { name: /Filters/ })
        );
        // The menu is portalled out of the popover; picking in it must not
        // close the popover before the pick lands.
        await user.click(screen.getByRole("button", { name: "Platform" }));
        await user.click(
            await screen.findByRole("option", { name: /PlayStation 5/ })
        );

        expect(search().get("platform")).toBe("playstation5");
        expect(search().get("page")).toBeNull();
        await waitFor(() =>
            expect(shelfAsked?.get("system")).toBe("playstation5")
        );
    });

    it("lets go of the platform on another shelf, which has its own", async () => {
        const user = setup("/user/devuser/games?type=played&platform=steam");

        await user.click(await screen.findByRole("tab", { name: /Backlog/ }));

        expect(search().get("type")).toBe("backlog");
        expect(search().get("platform")).toBeNull();
    });

    it("clears the ending and the platform together", async () => {
        const user = setup(
            "/user/devuser/games?type=played&ending=finished&platform=steam"
        );

        await user.click(
            await screen.findByRole("button", { name: "Filters, 2 on" })
        );
        await user.click(screen.getByRole("button", { name: "Clear" }));

        expect(search().get("ending")).toBeNull();
        expect(search().get("platform")).toBeNull();
        expect(search().get("type")).toBe("played");
    });

    it("searches the shelf by title, from the first page", async () => {
        const user = setup("/user/devuser/games?type=played&page=2");

        await user.click(
            await screen.findByRole("button", { name: "Filters" })
        );
        await user.type(
            screen.getByRole("searchbox", { name: "Title" }),
            "zelda"
        );

        await waitFor(() => expect(search().get("q")).toBe("zelda"));
        expect(search().get("page")).toBeNull();
        await waitFor(() => expect(shelfAsked?.get("q")).toBe("zelda"));
        expect(
            await screen.findByText(
                "Nothing on this shelf has “zelda” in its title."
            )
        ).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "Filters, 1 on" })
        ).toBeInTheDocument();
    });

    it("keeps the search on another shelf", async () => {
        const user = setup("/user/devuser/games?type=played&q=zelda");

        await user.click(await screen.findByRole("tab", { name: /Backlog/ }));

        expect(search().get("q")).toBe("zelda");
        await user.click(screen.getByRole("button", { name: "Filters, 1 on" }));
        expect(screen.getByRole("searchbox", { name: "Title" })).toHaveValue(
            "zelda"
        );
    });

    it("clears the search with the other filters", async () => {
        const user = setup(
            "/user/devuser/games?type=played&q=zelda&platform=steam"
        );

        await user.click(
            await screen.findByRole("button", { name: "Filters, 2 on" })
        );
        await user.click(screen.getByRole("button", { name: "Clear" }));

        expect(search().get("q")).toBeNull();
        expect(search().get("platform")).toBeNull();
        expect(screen.getByRole("searchbox", { name: "Title" })).toHaveValue(
            ""
        );
    });

    it("filters by a genre on the shelf, and lets go of it on another", async () => {
        const user = setup("/user/devuser/games?type=played&page=2");

        await user.click(
            await screen.findByRole("button", { name: "Filters" })
        );
        await user.click(await screen.findByRole("button", { name: "Genre" }));
        // Only the genres on this shelf are offered.
        expect(screen.queryByRole("option", { name: "Puzzle" })).toBeNull();
        await user.click(
            await screen.findByRole("option", { name: "Role-playing (RPG)" })
        );

        expect(search().get("genre")).toBe("role-playing-rpg");
        expect(search().get("page")).toBeNull();
        await waitFor(() =>
            expect(shelfAsked?.get("genre")).toBe("role-playing-rpg")
        );

        await user.click(screen.getByRole("tab", { name: /Backlog/ }));
        expect(search().get("genre")).toBeNull();
    });

    it("offers only what's in common on someone else's shelf, counted", async () => {
        mine = new Set([1]);
        const asked: URLSearchParams[] = [];
        server.use(
            http.get(`${API}/users/:username/shelf`, ({ request }) => {
                const params = new URL(request.url).searchParams;
                asked.push(params);
                return HttpResponse.json({
                    data: [],
                    meta: { page: 1, limit: 20, total: 7, totalPages: 1 },
                });
            })
        );
        const user = setup(
            "/user/devuser/games?type=played&genre=adventure",
            false
        );

        await user.click(
            await screen.findByRole("button", { name: /^Filters/ })
        );
        const toggle = await screen.findByRole("switch", {
            name: "Only show games you have both logged (7)",
        });
        // The count is asked with the other filters on, for one row.
        expect(
            asked.some(
                (p) =>
                    p.get("common") === "both" &&
                    p.get("limit") === "1" &&
                    p.get("genre") === "adventure"
            )
        ).toBe(true);

        await user.click(toggle);
        expect(search().get("common")).toBe("both");
        expect(toggle).toHaveAttribute("aria-checked", "true");
        await waitFor(() =>
            expect(
                asked.some(
                    (p) => p.get("common") === "both" && p.get("limit") !== "1"
                )
            ).toBe(true)
        );
    });

    it("doesn't offer it on your own shelf, or ask for it", async () => {
        mine = new Set([1]);
        const user = setup("/user/devuser/games?type=played&common=both");

        await user.click(
            await screen.findByRole("button", { name: "Filters" })
        );
        expect(screen.queryByRole("button", { name: "In common" })).toBeNull();
        await waitFor(() => expect(shelfAsked).not.toBeNull());
        expect(shelfAsked?.get("common")).toBeNull();
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

describe("importing from Steam", () => {
    const steamOn = () =>
        server.use(
            http.get(`${API}/me/steam`, () =>
                HttpResponse.json({ available: true })
            )
        );

    it("is offered on an empty played shelf", async () => {
        steamOn();
        setup("/user/devuser/games?type=played");
        expect(
            await screen.findByRole("button", { name: "Import from Steam" })
        ).toBeInTheDocument();
    });

    it("isn't offered on an empty wishlist", async () => {
        steamOn();
        server.use(
            http.get(`${API}/users/:username/wishlist`, () =>
                HttpResponse.json({ data: [], consoles: [] })
            )
        );
        setup("/user/devuser/games?type=wishlist");
        expect(
            await screen.findByText("Your wishlist is empty")
        ).toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: "Import from Steam" })
        ).toBeNull();
    });

    it("isn't offered while Steam isn't set up", async () => {
        server.use(
            http.get(`${API}/me/steam`, () =>
                HttpResponse.json({ available: false })
            )
        );
        setup("/user/devuser/games?type=played");
        expect(
            await screen.findByText("No played games yet")
        ).toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: "Import from Steam" })
        ).toBeNull();
    });
});
