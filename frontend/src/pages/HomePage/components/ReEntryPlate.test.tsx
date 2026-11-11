import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { buildGameLog } from "../../../test/msw/handlers";
import { renderWithProviders } from "../../../test/renderWithProviders";
import ReEntryPlate, { ReEntrySkeleton } from "./ReEntryPlate";

const base = {
    username: "devuser",
    displayName: "Kai",
    playing: [],
    yearLogs: [],
    yearStats: undefined,
    onUpdateLog: vi.fn(),
};

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
    it("welcomes a newcomer rather than back, with nothing on the go", () => {
        renderWithProviders(<ReEntryPlate {...base} isNew shelves={none} />);

        expect(
            screen.getByRole("heading", { name: "Welcome, Kai" })
        ).toBeInTheDocument();
        expect(
            screen.getByRole("heading", { name: "Nothing on the go" })
        ).toBeInTheDocument();
    });

    it("points someone with nothing on the go at their backlog first", () => {
        renderWithProviders(
            <ReEntryPlate {...base} isNew={false} shelves={shelves} />
        );
        expect(
            screen.getByText(/4 games waiting in your backlog/)
        ).toBeInTheDocument();
        expect(
            screen.getByRole("link", { name: "Pick from your backlog" })
        ).toHaveAttribute("href", "/user/devuser/games?type=backlog");
        expect(
            screen.getByRole("link", { name: "Browse the library" })
        ).toHaveAttribute("href", "/library");
    });

    it("sends someone with an empty backlog to the library alone", () => {
        renderWithProviders(
            <ReEntryPlate
                {...base}
                isNew={false}
                shelves={{ ...shelves, backlog: 0 }}
            />
        );
        expect(screen.queryByRole("link", { name: /backlog/ })).toBeNull();
        expect(
            screen.getByRole("link", { name: "Browse the library" })
        ).toHaveClass("bg-action");
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
