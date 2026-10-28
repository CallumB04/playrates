import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { GameListSummary } from "@playrates/shared";
import { server } from "../../../test/msw/server";
import { renderWithProviders } from "../../../test/renderWithProviders";
import ListsView from "./ListsView";

const API = "http://localhost:3000/api/v1";

const summary = (
    id: number,
    name: string,
    visibility: GameListSummary["visibility"] = "everyone"
): GameListSummary => ({
    id,
    name,
    description: "",
    visibility,
    colour: null,
    ranked: false,
    gameCount: 3,
    voteCount: 1,
    votedByViewer: false,
    myReaction: null,
    reactions: [],
    covers: [],
    owner: { username: "devuser", avatarUrl: null, accent: "indigo" },
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
});

const serve = (lists: GameListSummary[]) =>
    server.use(
        http.get(`${API}/users/devuser/lists`, () =>
            HttpResponse.json({
                data: lists,
                meta: { page: 1, limit: 12, total: lists.length },
            })
        )
    );

const render = (isOwner: boolean) =>
    renderWithProviders(
        <ListsView username="devuser" isOwner={isOwner} canSee />,
        { route: "/user/devuser/lists" }
    );

describe("ListsView", () => {
    it("links each list to its page, and tells its owner who can see it", async () => {
        serve([summary(1, "Cosy games"), summary(2, "Secret", "private")]);
        render(true);

        expect(
            await screen.findByRole("link", { name: /Cosy games/ })
        ).toHaveAttribute("href", "/user/devuser/lists/1");
        expect(screen.getByRole("link", { name: /Secret/ })).toHaveTextContent(
            "Only me"
        );
        // The public ones say so too, to their owner.
        expect(
            screen.getByRole("link", { name: /Cosy games/ })
        ).toHaveTextContent("Everyone");
        expect(
            screen.getByRole("button", { name: /New list/ })
        ).toBeInTheDocument();
    });

    it("offers a visitor no way to make one, and says when there are none", async () => {
        serve([]);
        render(false);

        expect(await screen.findByText("No lists yet.")).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /New list/ })).toBeNull();
    });
});
