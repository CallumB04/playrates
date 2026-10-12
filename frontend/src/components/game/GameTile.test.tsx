import { describe, expect, it, vi } from "vitest";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Eye, Heart, Layers } from "lucide-react";
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

/* The round button a phone shows in place of the hover rows. */
describe("GameTile standing button", () => {
    const render = (actions: TileAction[]) =>
        renderWithProviders(
            <GameTile
                gameId={1}
                title="Lanternfall"
                coverUrl={null}
                actions={actions}
            />
        );
    // The hover rows have buttons of the same names; this one is round.
    const round = () =>
        document.querySelector<HTMLButtonElement>("button.rounded-full")!;

    /* On someone else's profile a phone needs both their log and its own. */
    it("opens every action in a sheet when there are several", async () => {
        const view = vi.fn();
        const mine = vi.fn();
        render([
            { key: "view", label: "View log", tone: "primary", onSelect: view },
            { key: "add", label: "Log it", onSelect: mine },
            {
                key: "backlog",
                label: "Add to backlog",
                icon: Layers,
                onSelect: vi.fn(),
            },
        ]);

        expect(round()).toHaveAccessibleName("Actions for Lanternfall");
        expect(round().querySelector("svg")).toHaveClass(
            "lucide-ellipsis-vertical"
        );
        await userEvent.click(round());

        const sheet = screen.getByRole("dialog");
        expect(sheet).toHaveTextContent("Lanternfall");
        for (const label of ["View log", "Log it", "Add to backlog"]) {
            expect(
                within(sheet).getByRole("button", { name: label })
            ).toBeInTheDocument();
        }

        await userEvent.click(
            within(sheet).getByRole("button", { name: "Log it" })
        );
        expect(mine).toHaveBeenCalled();
        expect(view).not.toHaveBeenCalled();
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("presses a lone action directly, with its own icon", async () => {
        const view = vi.fn();
        render([
            {
                key: "view",
                label: "View log",
                tone: "primary",
                onSelect: view,
                standing: Eye,
            },
        ]);

        expect(round()).toHaveAccessibleName("View log");
        expect(round().querySelector("svg")).toHaveClass("lucide-eye");
        await userEvent.click(round());
        expect(view).toHaveBeenCalled();
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("falls back to a plus for a lone action without one", () => {
        render([
            {
                key: "signin",
                label: "Log in to add",
                tone: "primary",
                onSelect: vi.fn(),
            },
        ]);
        expect(round().querySelector("svg")).toHaveClass("lucide-plus");
    });
});
