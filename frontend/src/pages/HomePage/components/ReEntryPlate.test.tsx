import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { GameLogSummary } from "@playrates/shared";
import { server } from "../../../test/msw/server";
import {
    buildGame,
    buildGameLog,
    buildProfile,
    buildShelfEntry,
} from "../../../test/msw/handlers";
import { renderWithProviders } from "../../../test/renderWithProviders";
import ReEntryPlate, { ReEntrySkeleton } from "./ReEntryPlate";

vi.mock("../../../contexts/AuthContext", () => ({
    useAuth: () => ({ user: buildProfile() }),
}));

const API = "http://localhost:3000/api/v1";

const base = {
    username: "devuser",
    displayName: "Kai",
    playing: [],
    yearLogs: [],
    yearStats: undefined,
    trending: [],
    onUpdateLog: vi.fn(),
};

const backlogTop = buildGameLog({
    id: 21,
    status: "backlog",
    playedStatus: null,
    rating: null,
    hype: 4,
});

const backlogNext = buildGameLog({
    id: 22,
    gameId: 2,
    status: "backlog",
    playedStatus: null,
    rating: null,
    hype: null,
    game: { ...buildGameLog().game!, id: 2, title: "Hades II" },
});

let backlog = [buildShelfEntry([backlogTop])];
let logged: GameLogSummary[] = [];
let sent: { method: string; url: string; body: unknown }[] = [];

beforeEach(() => {
    backlog = [buildShelfEntry([backlogTop]), buildShelfEntry([backlogNext])];
    logged = [];
    sent = [];
    const record = async ({ request }: { request: Request }) => {
        sent.push({
            method: request.method,
            url: request.url,
            body: await request.json(),
        });
        return HttpResponse.json(buildGameLog());
    };
    server.use(
        http.get(`${API}/me/shelf`, () =>
            HttpResponse.json({
                data: backlog,
                meta: { page: 1, limit: 1, total: backlog.length },
            })
        ),
        http.get(`${API}/me/game-logs/ids`, () =>
            HttpResponse.json({ data: logged })
        ),
        http.patch(`${API}/me/logs/:id`, record),
        http.post(`${API}/me/logs`, record)
    );
});

const shelves = { played: 12, playing: 3, backlog: 4, wishlist: 0 };
const none = { played: 0, playing: 0, backlog: 0, wishlist: 0 };

const game = (id: number, title: string) => ({
    ...buildGameLog().game!,
    id,
    title,
});

const witcher = buildGameLog({
    status: "playing",
    hoursPlayed: 31,
    achievementsTotal: 50,
    achievementsCompleted: 20,
});
const hades = buildGameLog({
    id: 11,
    status: "playing",
    hoursPlayed: 4,
    rating: null,
    game: game(2, "Hades II"),
});
const balatro = buildGameLog({
    id: 12,
    status: "playing",
    game: game(3, "Balatro"),
});

/** The covers to switch between, in the order the row shows them. */
const covers = () =>
    screen
        .getAllByRole("button")
        .filter((b) => b.hasAttribute("aria-pressed"))
        .map((b) => b.getAttribute("aria-label"));

describe("ReEntryPlate", () => {
    it("welcomes a newcomer rather than back, with nothing on the go", async () => {
        renderWithProviders(<ReEntryPlate {...base} isNew shelves={none} />);

        expect(
            screen.getByRole("heading", { name: "Welcome, Kai" })
        ).toBeInTheDocument();
        expect(
            await screen.findByRole("heading", { name: "Nothing on the go" })
        ).toBeInTheDocument();
    });

    it("offers the backlog's most wanted games to start, each in one tap", async () => {
        renderWithProviders(
            <ReEntryPlate {...base} isNew={false} shelves={shelves} />
        );
        expect(
            await screen.findByText("Pick one up from your backlog")
        ).toBeInTheDocument();
        expect(
            screen.getByText("4 games waiting, the ones you want most first.")
        ).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "See all 4" })).toHaveAttribute(
            "href",
            "/user/devuser/games?type=backlog"
        );
        // Still a way out to something new.
        expect(
            screen.getByRole("link", { name: "Browse the library" })
        ).toHaveAttribute("href", "/library");

        await userEvent.click(
            screen.getByRole("button", { name: "Start playing Hades II" })
        );
        await waitFor(() => expect(sent).toHaveLength(1));
        expect(sent[0]).toMatchObject({
            method: "PATCH",
            url: `${API}/me/logs/22`,
            body: { status: "playing" },
        });
        // One at a time: the rest wait while it saves.
        expect(
            screen.getByRole("button", {
                name: "Start playing The Witcher 3: Wild Hunt",
            })
        ).toBeDisabled();
    });

    it("on a touch screen, shows what a tap does first and starts on the second", async () => {
        renderWithProviders(
            <ReEntryPlate {...base} isNew={false} shelves={shelves} />
        );
        const cover = await screen.findByRole("button", {
            name: "Start playing Hades II",
        });
        const tap = () =>
            userEvent.pointer({ keys: "[TouchA]", target: cover });

        await tap();
        expect(sent).toHaveLength(0);
        await tap();
        await waitFor(() => expect(sent).toHaveLength(1));
        expect(sent[0]).toMatchObject({ url: `${API}/me/logs/22` });
    });

    it("says so, and lets them try again, when starting fails", async () => {
        server.use(
            http.patch(
                `${API}/me/logs/:id`,
                () => new HttpResponse(null, { status: 500 })
            )
        );
        renderWithProviders(
            <ReEntryPlate {...base} isNew={false} shelves={shelves} />
        );
        const start = await screen.findByRole("button", {
            name: "Start playing Hades II",
        });
        await userEvent.click(start);
        await waitFor(() => expect(start).toBeEnabled());
        expect(start).toHaveTextContent("Start");
    });

    it("points at the backlog itself when its games can't be shown", async () => {
        backlog = [];
        renderWithProviders(
            <ReEntryPlate {...base} isNew={false} shelves={shelves} />
        );
        expect(
            await screen.findByText(/4 games waiting in your backlog/)
        ).toBeInTheDocument();
        expect(
            screen.getByRole("link", { name: "Pick from your backlog" })
        ).toHaveAttribute("href", "/user/devuser/games?type=backlog");
        expect(
            screen.getByRole("link", { name: "Browse the library" })
        ).toHaveAttribute("href", "/library");
    });

    it("with an empty backlog, offers trending games not on a shelf yet", async () => {
        logged = [
            {
                gameId: 1,
                status: "played",
                playedStatus: null,
                rating: null,
                logs: [],
            },
        ];
        renderWithProviders(
            <ReEntryPlate
                {...base}
                isNew={false}
                shelves={{ ...shelves, backlog: 0 }}
                trending={[
                    buildGame(),
                    buildGame({ id: 2, title: "Hades II" }),
                ]}
            />
        );
        expect(
            await screen.findByText(
                "Nothing on your backlog either, so here’s what’s trending this week."
            )
        ).toBeInTheDocument();
        expect(
            screen.queryByRole("button", {
                name: "Start playing The Witcher 3: Wild Hunt",
            })
        ).toBeNull();

        await userEvent.click(
            screen.getByRole("button", { name: "Start playing Hades II" })
        );
        await waitFor(() => expect(sent).toHaveLength(1));
        expect(sent[0]).toMatchObject({
            method: "POST",
            body: { gameId: 2, status: "playing" },
        });
    });

    it("sends someone with every trending game logged to the library alone", async () => {
        renderWithProviders(
            <ReEntryPlate
                {...base}
                isNew={false}
                shelves={{ ...shelves, backlog: 0 }}
            />
        );
        expect(
            await screen.findByRole("link", { name: "Browse the library" })
        ).toHaveClass("bg-action");
        expect(screen.queryByRole("link", { name: /backlog/ })).toBeNull();
    });

    it("leads with the game on the go, its figures, and a way to update it", async () => {
        const onUpdateLog = vi.fn();
        renderWithProviders(
            <ReEntryPlate
                {...base}
                isNew={false}
                playing={[witcher, hades]}
                shelves={shelves}
                onUpdateLog={onUpdateLog}
            />
        );

        expect(
            screen.getByRole("heading", { name: "Now playing" })
        ).toBeInTheDocument();
        expect(
            screen.getByRole("link", { name: "The Witcher 3: Wild Hunt" })
        ).toHaveAttribute("href", "/game/1");
        expect(screen.getByText("31h")).toBeInTheDocument();
        expect(screen.getByText("40%")).toBeInTheDocument();

        await userEvent.click(screen.getByRole("button", { name: "Update" }));
        expect(onUpdateLog).toHaveBeenCalledWith(witcher);
    });

    it("says so when a run has nothing to show yet", () => {
        renderWithProviders(
            <ReEntryPlate
                {...base}
                isNew={false}
                playing={[{ ...hades, hoursPlayed: null }]}
                shelves={shelves}
            />
        );
        expect(screen.getByText("No hours or rating yet")).toBeInTheDocument();
    });

    // The row never reorders: picking another only moves which is shown.
    it("shows another game on the go from its cover, the row staying put", async () => {
        const onUpdateLog = vi.fn();
        renderWithProviders(
            <ReEntryPlate
                {...base}
                isNew={false}
                playing={[witcher, hades, balatro]}
                shelves={shelves}
                onUpdateLog={onUpdateLog}
            />
        );
        const order = ["The Witcher 3: Wild Hunt", "Hades II", "Balatro"];

        expect(covers()).toEqual(order);
        expect(
            screen.getByRole("button", { name: "The Witcher 3: Wild Hunt" })
        ).toHaveAttribute("aria-pressed", "true");

        await userEvent.click(screen.getByRole("button", { name: "Hades II" }));
        expect(
            screen.getByRole("link", { name: "Hades II" })
        ).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "Hades II" })
        ).toHaveAttribute("aria-pressed", "true");
        expect(covers()).toEqual(order);

        await userEvent.click(screen.getByRole("button", { name: "Update" }));
        expect(onUpdateLog).toHaveBeenCalledWith(hades);
    });

    it("keeps the row of covers for when there's more than one", () => {
        renderWithProviders(
            <ReEntryPlate
                {...base}
                isNew={false}
                playing={[witcher]}
                shelves={{ ...shelves, playing: 1 }}
            />
        );
        expect(screen.queryByText(/On the go/)).toBeNull();
    });

    it("counts what doesn't fit, and opens the shelf from the count", () => {
        const many = [witcher, hades, balatro].concat(
            [13, 14, 15].map((id) =>
                buildGameLog({
                    id,
                    status: "playing",
                    game: game(id, `G${id}`),
                })
            )
        );
        renderWithProviders(
            <ReEntryPlate
                {...base}
                isNew={false}
                playing={many}
                shelves={{ ...shelves, playing: 8 }}
            />
        );
        // Four covers and the count, in the space of five.
        expect(covers()).toHaveLength(4);
        const rest = screen.getByRole("link", { name: "See all 8" });
        expect(rest).toHaveTextContent("+4");
        expect(rest).toHaveAttribute(
            "href",
            "/user/devuser/games?type=playing"
        );
    });

    it("opens each shelf from its count", () => {
        renderWithProviders(
            <ReEntryPlate {...base} isNew={false} shelves={shelves} />
        );
        expect(
            screen.getByRole("link", { name: /Played\s*12/ })
        ).toHaveAttribute("href", "/user/devuser/games?type=played");
    });

    describe("while loading", () => {
        it("greets no one until it knows whether they're new", () => {
            renderWithProviders(
                <ReEntryPlate {...base} isNew={undefined} shelves={shelves} />
            );
            // Empty, as toHaveTextContent("") would pass whatever it said.
            expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
                ""
            );
        });

        it("holds the card's place rather than saying nothing's on the go", () => {
            renderWithProviders(
                <ReEntryPlate
                    {...base}
                    isNew={false}
                    playing={undefined}
                    shelves={shelves}
                />
            );
            expect(screen.queryByText("Nothing on the go")).toBeNull();
            expect(screen.queryByText("Now playing")).toBeNull();
        });

        // What it offers depends on the backlog, so it doesn't guess.
        it("waits for the shelves before asking for something to start", () => {
            renderWithProviders(
                <ReEntryPlate {...base} isNew={false} shelves={undefined} />
            );
            expect(screen.queryByText("Nothing on the go")).toBeNull();
        });

        it("shows no shelf counts before they arrive, rather than zeros", () => {
            renderWithProviders(
                <ReEntryPlate {...base} isNew={false} shelves={undefined} />
            );
            const played = screen.getByRole("link", { name: "Played" });
            expect(played).toHaveAttribute(
                "href",
                "/user/devuser/games?type=played"
            );
            expect(played).not.toHaveTextContent("0");
        });

        it("draws the outline with nothing to follow before the account loads", () => {
            renderWithProviders(<ReEntrySkeleton />);
            expect(screen.queryAllByRole("link")).toHaveLength(0);
            expect(screen.getByText("Played")).toBeInTheDocument();
        });
    });
});
