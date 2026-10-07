import { describe, expect, it, vi } from "vitest";
import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Heart, Layers } from "lucide-react";
import { renderWithProviders } from "../../test/renderWithProviders";
import GameTile, { type TileAction } from "./GameTile";

/** A request the test decides the outcome of. */
const deferred = () => {
    let resolve!: () => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<void>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
};

const setup = (backlog: () => Promise<unknown>) => {
    const wishlist = vi.fn(async () => {});
    const create = vi.fn();
    const actions: TileAction[] = [
        { key: "log", label: "Create log", tone: "primary", onSelect: create },
        {
            key: "backlog",
            label: "Add to backlog",
            icon: Layers,
            onSelect: backlog,
            doneLabel: "In your backlog",
        },
        {
            key: "wishlist",
            label: "Add to wishlist",
            icon: Heart,
            onSelect: wishlist,
            doneLabel: "On your wishlist",
        },
    ];
    renderWithProviders(
        <GameTile
            gameId={1}
            title="Lanternfall"
            coverUrl={null}
            actions={actions}
        />
    );
    // By title: a folded button is hidden from the accessibility tree.
    const button = (label: string) => screen.getAllByTitle(label)[0]!;
    return { wishlist, create, button };
};

describe("GameTile quick-add", () => {
    /* Wishlist, then backlog before the first came back: two saves raced and
       the second failed. */
    it("holds every other action still while one is out", async () => {
        const request = deferred();
        const { wishlist, button } = setup(() => request.promise);

        await userEvent.click(button("Add to backlog"));

        expect(button("Add to wishlist")).toBeDisabled();
        expect(screen.getByText("Create log").closest("button")).toBeDisabled();
        await userEvent.click(button("Add to wishlist"));
        expect(wishlist).not.toHaveBeenCalled();

        await act(async () => request.resolve());
    });

    /* A tap that waited on the round trip looked ignored. */
    it("says it worked straight away, before the request comes back", async () => {
        const request = deferred();
        const { button } = setup(() => request.promise);

        await userEvent.click(button("Add to backlog"));

        expect(screen.getByText("In your backlog")).toBeInTheDocument();
        expect(button("Add to wishlist")).toBeDisabled();

        await act(async () => request.resolve());
    });

    /* Shown as done, but still out: the others must not be pressable yet,
       however long the request takes. */
    it("holds the other actions until the request is back, past the confirmation", async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        const request = deferred();
        const { button } = setup(() => request.promise);

        await userEvent.click(button("Add to backlog"));
        await act(async () => vi.advanceTimersByTime(3000));
        expect(button("Add to wishlist")).toBeDisabled();

        await act(async () => request.resolve());
        await act(async () => vi.advanceTimersByTime(1500));
        expect(button("Add to wishlist")).toBeEnabled();
        vi.useRealTimers();
    });

    it("hands the buttons back when the request fails", async () => {
        const request = deferred();
        const { button } = setup(() => request.promise);

        await userEvent.click(button("Add to backlog"));
        await act(async () => request.reject(new Error("offline")));

        await waitFor(() => expect(button("Add to wishlist")).toBeEnabled());
        expect(button("Add to backlog")).toBeEnabled();
        expect(screen.getByText("Create log").closest("button")).toBeEnabled();
    });

    it("lets go after the confirmation has been read", async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        const { button } = setup(async () => {});

        await userEvent.click(button("Add to backlog"));
        expect(await screen.findByText("In your backlog")).toBeInTheDocument();

        await act(async () => vi.advanceTimersByTime(1500));
        expect(screen.queryByText("In your backlog")).toBeNull();
        expect(button("Add to wishlist")).toBeEnabled();
        vi.useRealTimers();
    });
});

describe("GameTile prefetch", () => {
    const API = "http://localhost:3000/api/v1";

    it("loads the game when the pointer rests on its tile, not when it passes", async () => {
        const fetched = vi.fn();
        const { server } = await import("../../test/msw/server");
        const { http, HttpResponse } = await import("msw");
        const { buildGame } = await import("../../test/msw/handlers");
        server.use(
            http.get(`${API}/games/:id`, ({ params }) => {
                fetched(params.id);
                return HttpResponse.json(buildGame({ id: Number(params.id) }));
            })
        );
        renderWithProviders(
            <GameTile gameId={7} title="Lanternfall" coverUrl={null} />
        );
        const link = screen.getByRole("link", { name: /Lanternfall/ });

        await userEvent.hover(link);
        await userEvent.unhover(link);
        await new Promise((r) => setTimeout(r, 200));
        expect(fetched).not.toHaveBeenCalled();

        await userEvent.hover(link);
        await waitFor(() => expect(fetched).toHaveBeenCalledWith("7"));
    });
});
