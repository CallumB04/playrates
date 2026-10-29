import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { GameListDetail } from "@playrates/shared";
import { server } from "../../../test/msw/server";
import { renderWithProviders } from "../../../test/renderWithProviders";
import PinnedLists from "./PinnedLists";

const API = "http://localhost:3000/api/v1";

const list = (id: number, name: string): GameListDetail => ({
    id,
    name,
    description: "",
    visibility: "everyone",
    colour: null,
    ranked: false,
    gameCount: 0,
    voteCount: 0,
    votedByViewer: false,
    myReaction: null,
    reactions: [],
    covers: [],
    owner: { username: "devuser", avatarUrl: null, accent: "indigo" },
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    coverGameIds: null,
    games: [],
});

// A list the viewer can't see answers 404, as a hidden one does.
const serve = (visible: Record<number, string>) =>
    server.use(
        http.get(`${API}/lists/:id`, ({ params }) => {
            const name = visible[Number(params.id)];
            return name
                ? HttpResponse.json(list(Number(params.id), name))
                : new HttpResponse(null, { status: 404 });
        })
    );

describe("PinnedLists", () => {
    it("shows the pinned lists this viewer can see", async () => {
        serve({ 1: "Cosy games" });
        renderWithProviders(<PinnedLists ids={[1, 2]} />);
        expect(await screen.findByText("Cosy games")).toBeInTheDocument();
    });

    // It used to stand there empty for anyone the lists were hidden from.
    it("leaves the card out when none of them can be shown", async () => {
        serve({});
        renderWithProviders(<PinnedLists ids={[2]} />);
        await new Promise((r) => setTimeout(r, 100));
        expect(screen.queryByText("Pinned lists")).toBeNull();
    });
});
