import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { GameListDetail } from "@playrates/shared";
import { server } from "../../test/msw/server";
import { buildGame } from "../../test/msw/handlers";
import { renderWithProviders } from "../../test/renderWithProviders";
import ListEditor from "./ListEditor";

const API = "http://localhost:3000/api/v1";

const games = [1, 2, 3, 4, 5].map((id) =>
    buildGame({ id, title: `Game ${id}`, slug: `game-${id}` })
);

const list: GameListDetail = {
    id: 9,
    name: "Best RPGs",
    description: "",
    visibility: "everyone",
    colour: null,
    ranked: true,
    gameCount: games.length,
    voteCount: 0,
    votedByViewer: false,
    covers: [],
    owner: { username: "devuser", avatarUrl: null, accent: "indigo" },
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    coverGameIds: null,
    games: games.map((game, i) => ({
        game,
        rank: i + 1,
        addedAt: "2026-01-01T00:00:00Z",
    })),
};

let sent: Record<string, unknown> | null;

beforeEach(() => {
    sent = null;
    server.use(
        http.patch(`${API}/me/lists/9`, async ({ request }) => {
            sent = (await request.json()) as Record<string, unknown>;
            return HttpResponse.json({ ...list, ...sent });
        }),
        http.post(`${API}/me/lists`, async ({ request }) => {
            sent = (await request.json()) as Record<string, unknown>;
            return HttpResponse.json({ ...list, ...sent, id: 10 });
        })
    );
});

describe("ListEditor", () => {
    /* The picture is the first four until someone picks: those four read as
       chosen already, rather than nothing being ticked. */
    it("starts with the covers its picture shows, ticked in order", async () => {
        renderWithProviders(<ListEditor list={list} onClose={vi.fn()} />);
        const user = userEvent.setup({ delay: null });

        await user.click(screen.getByRole("tab", { name: "Covers & colour" }));

        const ticked = screen
            .getAllByRole("button", { pressed: true })
            .map((b) => b.getAttribute("aria-label"));
        expect(ticked).toEqual(["Game 1", "Game 2", "Game 3", "Game 4"]);
        expect(
            screen.queryByRole("button", { name: "Use the first four" })
        ).toBeNull();
    });

    /* With no onSaved, `onSaved?.(await save())` skipped the save itself,
       and the editor closed having sent nothing. */
    it("saves the covers picked, in the order they were picked", async () => {
        const onClose = vi.fn();
        renderWithProviders(<ListEditor list={list} onClose={onClose} />);
        const user = userEvent.setup({ delay: null });

        await user.click(screen.getByRole("tab", { name: "Covers & colour" }));
        await user.click(screen.getByRole("button", { name: "Game 2" }));
        await user.click(screen.getByRole("button", { name: "Game 3" }));
        await user.click(screen.getByRole("button", { name: "Game 5" }));
        await user.click(screen.getByRole("button", { name: /^Save/ }));

        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(sent).toMatchObject({ coverGameIds: [1, 4, 5] });
    });

    it("goes back to the first four when told to", async () => {
        const onClose = vi.fn();
        renderWithProviders(
            <ListEditor
                list={{ ...list, coverGameIds: [5] }}
                onClose={onClose}
            />
        );
        const user = userEvent.setup({ delay: null });

        await user.click(screen.getByRole("tab", { name: "Covers & colour" }));
        await user.click(
            screen.getByRole("button", { name: "Use the first four" })
        );
        await user.click(screen.getByRole("button", { name: /^Save/ }));

        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(sent).toMatchObject({ coverGameIds: null });
    });

    it("makes a new list with the game it was started from", async () => {
        const onSaved = vi.fn();
        renderWithProviders(
            <ListEditor startWith={[3]} onClose={vi.fn()} onSaved={onSaved} />
        );
        const user = userEvent.setup({ delay: null });

        expect(
            screen.getByRole("button", { name: /Create list/ })
        ).toBeDisabled();
        await user.type(screen.getByLabelText("Name"), "Cosy games");
        await user.click(screen.getByRole("radio", { name: /Friends/ }));
        await user.click(screen.getByRole("button", { name: /Create list/ }));

        await waitFor(() => expect(onSaved).toHaveBeenCalled());
        expect(sent).toMatchObject({
            name: "Cosy games",
            visibility: "friends",
            colour: null,
            ranked: false,
            gameIds: [3],
        });
    });
});
