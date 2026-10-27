import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { WishlistEntry } from "@playrates/shared";
import { server } from "../../../test/msw/server";
import {
    buildGame,
    buildGameLog,
    buildShelfEntry,
} from "../../../test/msw/handlers";
import { renderWithProviders } from "../../../test/renderWithProviders";
import ToastStack from "../../../components/feedback/ToastStack";
import { useUserWishlist } from "../../../hooks/queries/useWishlist";
import type { WishlistSort } from "../lib/wishlist";
import WishlistList from "./WishlistList";

vi.mock("../../../contexts/AuthContext", () => ({
    useAuth: () => ({ user: { username: "devuser" } }),
}));

const API = "http://localhost:3000/api/v1";

const consolesOf: Record<number, (string | null)[]> = {
    1: ["steam"],
    2: ["steam", "playstation5"],
    3: ["playstation5"],
    4: [null],
};

const entry = (id: number, rank: number): WishlistEntry => ({
    ...buildShelfEntry([
        buildGameLog({
            id,
            gameId: id,
            status: "wishlist",
            game: buildGame({ id, title: `Game ${id}`, slug: `game-${id}` }),
        }),
    ]),
    rank,
    consoles: consolesOf[id]!,
});

let order: number[];
let saved: number[] | null;
let failSave: boolean;

beforeEach(() => {
    order = [1, 2, 3, 4];
    saved = null;
    failSave = false;
    server.use(
        http.get(`${API}/users/devuser/wishlist`, () =>
            HttpResponse.json({
                data: order.map((id, i) => entry(id, i + 1)),
                total: order.length,
                consoles: ["playstation5", "steam"],
            })
        ),
        http.put(`${API}/me/wishlist/order`, async ({ request }) => {
            if (failSave) {
                return HttpResponse.json(
                    { error: { message: "nope" } },
                    { status: 500 }
                );
            }
            saved = ((await request.json()) as { gameIds: number[] }).gameIds;
            order = saved;
            return new HttpResponse(null, { status: 204 });
        }),
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

/** The list as the page feeds it: from the cache the save updates. */
const Harness = (props: {
    sort?: WishlistSort;
    console?: string;
    isMyAccount?: boolean;
}) => {
    const { data } = useUserWishlist("devuser");
    if (!data) return null;
    return (
        <>
            <WishlistList
                wishlist={data.data}
                sort={props.sort ?? "rank"}
                console={props.console}
                isMyAccount={props.isMyAccount ?? true}
                buildTileActions={() => []}
            />
            <ToastStack />
        </>
    );
};

const setup = async (props: Parameters<typeof Harness>[0] = {}) => {
    renderWithProviders(<Harness {...props} />);
    await screen.findByText("Game 1");
    return userEvent.setup({ delay: null });
};

const shown = () =>
    screen
        .getAllByRole("link")
        .filter((a) => a.textContent?.startsWith("#"))
        .map((a) => a.textContent);

const openSheet = async (
    user: ReturnType<typeof userEvent.setup>,
    title: string
) => {
    await user.click(screen.getByRole("button", { name: `More for ${title}` }));
    return within(screen.getByRole("dialog"));
};

describe("WishlistList", () => {
    it("shows a game wished for on two consoles as one row, with both", async () => {
        await setup();

        expect(shown()).toEqual([
            "#1 Game 1",
            "#2 Game 2",
            "#3 Game 3",
            "#4 Game 4",
        ]);
        const row = screen.getByText("Game 2").closest("li")!;
        expect(
            await within(row).findByText("Steam", { selector: "li" })
        ).toBeInTheDocument();
        expect(
            within(row).getByText("PlayStation 5", { selector: "li" })
        ).toBeInTheDocument();
        expect(
            within(screen.getByText("Game 4").closest("li")!).getByText(
                "Any platform"
            )
        ).toBeInTheDocument();
    });

    it("saves the whole order when a game is sent to the top", async () => {
        const user = await setup();

        const sheet = await openSheet(user, "Game 3");
        await user.click(sheet.getByRole("button", { name: /To the top/ }));

        await waitFor(() => expect(saved).toEqual([3, 1, 2, 4]));
        expect(shown()).toEqual([
            "#1 Game 3",
            "#2 Game 1",
            "#3 Game 2",
            "#4 Game 4",
        ]);
    });

    it("moves a game to a place typed in", async () => {
        const user = await setup();

        const sheet = await openSheet(user, "Game 1");
        const field = sheet.getByRole("spinbutton");
        await user.clear(field);
        await user.type(field, "3{Enter}");

        await waitFor(() => expect(saved).toEqual([2, 3, 1, 4]));
    });

    it("puts the order back and says so when the save fails", async () => {
        failSave = true;
        const user = await setup();

        const sheet = await openSheet(user, "Game 4");
        await user.click(sheet.getByRole("button", { name: /To the top/ }));

        expect(
            await screen.findByText("Couldn't save your wishlist order")
        ).toBeInTheDocument();
        await waitFor(() =>
            expect(shown()).toEqual([
                "#1 Game 1",
                "#2 Game 2",
                "#3 Game 3",
                "#4 Game 4",
            ])
        );
    });

    it("offers no reordering while a platform filter hides some of it", async () => {
        const user = await setup({ console: "steam" });

        expect(shown()).toEqual(["#1 Game 1", "#2 Game 2"]);
        expect(
            screen.queryByRole("button", { name: /^Move Game/ })
        ).not.toBeInTheDocument();
        expect(
            screen.getByText("Clear the platform filter to rearrange.")
        ).toBeInTheDocument();
        const sheet = await openSheet(user, "Game 2");
        expect(
            sheet.queryByRole("button", { name: /To the top/ })
        ).not.toBeInTheDocument();
    });

    it("moves a game one place down", async () => {
        const user = await setup();

        const sheet = await openSheet(user, "Game 2");
        await user.click(sheet.getByRole("button", { name: /Down one/ }));

        await waitFor(() => expect(saved).toEqual([1, 3, 2, 4]));
    });

    it("offers no reordering in another sort, and says how to get it", async () => {
        await setup({ sort: "title" });

        expect(
            screen.queryByRole("button", { name: /^Move Game/ })
        ).not.toBeInTheDocument();
        expect(
            screen.getByText("Sort by your order to rearrange.")
        ).toBeInTheDocument();
    });

    it("is read-only to a visitor", async () => {
        const user = await setup({ isMyAccount: false });

        expect(
            screen.queryByRole("button", { name: /^Move Game/ })
        ).not.toBeInTheDocument();
        const sheet = await openSheet(user, "Game 2");
        expect(
            sheet.queryByRole("button", { name: /To the top/ })
        ).not.toBeInTheDocument();
        expect(
            sheet.getByText("#2 of 4 on their wishlist")
        ).toBeInTheDocument();
    });
});
