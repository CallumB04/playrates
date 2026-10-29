import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { GameListDetail } from "@playrates/shared";
import { renderWithProviders } from "../../test/renderWithProviders";
import { buildGame } from "../../test/msw/handlers";
import ShareList from "./ShareList";
import { listImageFileName } from "./listImageFileName";

const buildList = (
    overrides: Partial<GameListDetail> = {}
): GameListDetail => ({
    id: 7,
    name: "Maps worth getting lost in",
    description: "",
    visibility: "everyone",
    colour: null,
    ranked: false,
    gameCount: 1,
    voteCount: 0,
    votedByViewer: false,
    myReaction: null,
    reactions: [],
    covers: [],
    owner: { username: "marlowe", avatarUrl: null, accent: "violet" },
    createdAt: "2026-10-01T00:00:00Z",
    updatedAt: "2026-10-02T00:00:00Z",
    coverGameIds: null,
    games: [{ game: buildGame(), rank: 1, addedAt: "2026-10-01T00:00:00Z" }],
    ...overrides,
});

const open = async () =>
    userEvent.click(screen.getByRole("button", { name: "Share" }));

describe("ShareList", () => {
    it("shares the list's own link with the viewer's invite and its picture", async () => {
        renderWithProviders(
            <ShareList list={buildList()} viewerUsername="devuser" />
        );

        await open();

        expect(
            screen.getByRole("heading", { name: "Maps worth getting lost in" })
        ).toBeInTheDocument();
        expect(
            screen.getByText(
                `${window.location.host}/user/marlowe/lists/7?ref=devuser`
            )
        ).toBeInTheDocument();
        const image = document.querySelector("img");
        expect(image?.getAttribute("src")).toMatch(
            /\/api\/v1\/lists\/7\/image\?v=1\.\d+$/
        );
        const post = new URL(
            screen.getByRole("link", { name: "X" }).getAttribute("href")!
        );
        expect(post.searchParams.get("text")).toBe(
            "Maps worth getting lost in, a list by marlowe on PlayRates"
        );
    });

    it("leaves the invite off for someone signed out", async () => {
        renderWithProviders(<ShareList list={buildList()} />);

        await open();

        expect(
            screen.getByText(`${window.location.host}/user/marlowe/lists/7`)
        ).toBeInTheDocument();
    });

    it("isn't offered for a list not everyone may see, or an empty one", () => {
        const { rerender } = renderWithProviders(
            <ShareList list={buildList({ visibility: "friends" })} />
        );
        expect(screen.queryByRole("button", { name: "Share" })).toBeNull();

        rerender(<ShareList list={buildList({ visibility: "private" })} />);
        expect(screen.queryByRole("button", { name: "Share" })).toBeNull();

        rerender(<ShareList list={buildList({ gameCount: 0, games: [] })} />);
        expect(screen.queryByRole("button", { name: "Share" })).toBeNull();
    });
});

describe("listImageFileName", () => {
    it("names the picture after its owner and the list", () => {
        expect(listImageFileName(buildList())).toBe(
            "marlowe-maps-worth-getting-lost-in.png"
        );
    });

    it("keeps letters an accent sat on and drops the rest", () => {
        expect(
            listImageFileName(buildList({ name: "  Pokémon: Gen 1 & 2!! " }))
        ).toBe("marlowe-pokemon-gen-1-2.png");
    });

    it("falls back to the list's number for a name with nothing to keep", () => {
        expect(listImageFileName(buildList({ name: "★★★" }))).toBe(
            "marlowe-list-7.png"
        );
    });
});
