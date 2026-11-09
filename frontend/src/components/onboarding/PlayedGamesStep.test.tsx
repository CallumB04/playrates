import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../../test/msw/server";
import { API_BASE, buildGame, paginated } from "../../test/msw/handlers";
import { renderWithProviders } from "../../test/renderWithProviders";
import PlayedGamesStep from "./PlayedGamesStep";

describe("PlayedGamesStep", () => {
    it("searches past the most logged for a game someone has played", async () => {
        const searched: (string | null)[] = [];
        server.use(
            http.get(`${API_BASE}/games`, ({ request }) => {
                const search = new URL(request.url).searchParams.get("search");
                searched.push(search);
                return HttpResponse.json(
                    paginated(
                        search
                            ? [buildGame({ id: 9, title: "Pentiment" })]
                            : [buildGame({ id: 1, title: "Hades" })]
                    )
                );
            })
        );
        renderWithProviders(
            <PlayedGamesStep titleId="t" preview onDone={vi.fn()} />
        );
        const u = userEvent.setup();

        expect(
            await screen.findByRole("button", { name: "Hades" })
        ).toBeInTheDocument();
        await u.type(screen.getByLabelText("Search for a game"), "penti");

        expect(
            await screen.findByRole("button", { name: "Pentiment" })
        ).toBeInTheDocument();
        await waitFor(() => expect(searched).toContain("penti"));
    });

    it("asks once typing pauses, not for every letter", async () => {
        const searched: (string | null)[] = [];
        server.use(
            http.get(`${API_BASE}/games`, ({ request }) => {
                searched.push(new URL(request.url).searchParams.get("search"));
                return HttpResponse.json(paginated([buildGame({ id: 1 })]));
            })
        );
        renderWithProviders(
            <PlayedGamesStep titleId="t" preview onDone={vi.fn()} />
        );
        // No pause between letters, so only the last one can settle.
        const u = userEvent.setup({ delay: null });

        await u.type(screen.getByLabelText("Search for a game"), "pentiment");

        await waitFor(() => expect(searched).toContain("pentiment"));
        expect(searched.filter(Boolean)).toEqual(["pentiment"]);
    });

    it("hides the last results while a new search is on its way", async () => {
        let answer!: () => void;
        const answered = new Promise<void>((resolve) => (answer = resolve));
        server.use(
            http.get(`${API_BASE}/games`, async ({ request }) => {
                if (!new URL(request.url).searchParams.get("search")) {
                    return HttpResponse.json(
                        paginated([buildGame({ id: 1, title: "Hades" })])
                    );
                }
                await answered;
                return HttpResponse.json(paginated([]));
            }),
            http.get(`${API_BASE}/games/search`, () =>
                HttpResponse.json(paginated([]))
            )
        );
        renderWithProviders(
            <PlayedGamesStep titleId="t" preview onDone={vi.fn()} />
        );
        const u = userEvent.setup();

        await screen.findByRole("button", { name: "Hades" });
        await u.type(screen.getByLabelText("Search for a game"), "zzz");

        expect(
            screen.queryByRole("button", { name: "Hades" })
        ).not.toBeInTheDocument();
        expect(screen.getByRole("list")).toHaveAttribute("aria-busy", "true");
        expect(screen.queryByText(/Nothing matches/)).not.toBeInTheDocument();

        answer();
        expect(
            await screen.findByText("Nothing matches “zzz”.")
        ).toBeInTheDocument();
    });

    it("shows a search it has made before at once, without asking again", async () => {
        const searched: (string | null)[] = [];
        server.use(
            http.get(`${API_BASE}/games`, ({ request }) => {
                const search = new URL(request.url).searchParams.get("search");
                searched.push(search);
                return HttpResponse.json(
                    paginated(
                        search
                            ? [buildGame({ id: 9, title: "Pentiment" })]
                            : [buildGame({ id: 1, title: "Hades" })]
                    )
                );
            })
        );
        renderWithProviders(
            <PlayedGamesStep titleId="t" preview onDone={vi.fn()} />
        );
        const u = userEvent.setup({ delay: null });
        const field = screen.getByLabelText("Search for a game");

        await screen.findByRole("button", { name: "Hades" });
        await u.type(field, "penti");
        await screen.findByRole("button", { name: "Pentiment" });

        await u.clear(field);
        expect(screen.getByRole("button", { name: "Hades" })).toBeVisible();
        await u.type(field, "penti");
        expect(screen.getByRole("button", { name: "Pentiment" })).toBeVisible();

        expect(searched).toEqual([null, "penti"]);
    });

    it("looks past the catalogue for a game it doesn’t have yet", async () => {
        const reached: (string | null)[] = [];
        const silksong = buildGame({ id: 7, title: "Hollow Knight: Silksong" });
        let imported = false;
        server.use(
            http.get(`${API_BASE}/games`, ({ request }) => {
                const search = new URL(request.url).searchParams.get("search");
                if (!search) {
                    return HttpResponse.json(
                        paginated([buildGame({ id: 1, title: "Hades" })])
                    );
                }
                return HttpResponse.json(paginated(imported ? [silksong] : []));
            }),
            http.get(`${API_BASE}/games/search`, ({ request }) => {
                reached.push(new URL(request.url).searchParams.get("q"));
                imported = true;
                return HttpResponse.json(paginated([silksong]));
            })
        );
        renderWithProviders(
            <PlayedGamesStep titleId="t" preview onDone={vi.fn()} />
        );
        const u = userEvent.setup();

        await u.type(screen.getByLabelText("Search for a game"), "silksong");

        expect(
            await screen.findByRole("button", {
                name: "Hollow Knight: Silksong",
            })
        ).toBeInTheDocument();
        expect(reached).toEqual(["silksong"]);
    });

    it("says it’s looking further, then that nothing matches if nothing turns up", async () => {
        let answer!: () => void;
        const answered = new Promise<void>((resolve) => (answer = resolve));
        server.use(
            http.get(`${API_BASE}/games`, () =>
                HttpResponse.json(paginated([]))
            ),
            http.get(`${API_BASE}/games/search`, async () => {
                await answered;
                return HttpResponse.json(paginated([]));
            })
        );
        renderWithProviders(
            <PlayedGamesStep titleId="t" preview onDone={vi.fn()} />
        );
        const u = userEvent.setup();

        await u.type(screen.getByLabelText("Search for a game"), "zzqx");

        expect(
            await screen.findByText("Looking further for “zzqx”…")
        ).toBeInTheDocument();
        expect(screen.queryByText(/Nothing matches/)).not.toBeInTheDocument();

        answer();
        expect(
            await screen.findByText("Nothing matches “zzqx”.")
        ).toBeInTheDocument();
        expect(screen.queryByText(/Looking further/)).not.toBeInTheDocument();
    });

    it("shows the closest titles for a near miss, and still looks further", async () => {
        const reached: (string | null)[] = [];
        const witcher = buildGame({ id: 5, title: "The Witcher 3: Wild Hunt" });
        server.use(
            http.get(`${API_BASE}/games`, ({ request }) => {
                if (!new URL(request.url).searchParams.get("search")) {
                    return HttpResponse.json(paginated([]));
                }
                return HttpResponse.json({
                    data: [witcher],
                    meta: { page: 1, limit: 12, total: 1, approximate: true },
                });
            }),
            http.get(`${API_BASE}/games/search`, ({ request }) => {
                reached.push(new URL(request.url).searchParams.get("q"));
                return HttpResponse.json(paginated([witcher]));
            })
        );
        renderWithProviders(
            <PlayedGamesStep titleId="t" preview onDone={vi.fn()} />
        );
        const u = userEvent.setup();

        await u.type(screen.getByLabelText("Search for a game"), "witchr");

        expect(
            await screen.findByRole("button", {
                name: "The Witcher 3: Wild Hunt",
            })
        ).toBeInTheDocument();
        expect(
            screen.getByText(
                "Nothing is called “witchr”, so these are the closest titles."
            )
        ).toBeInTheDocument();
        await waitFor(() => expect(reached).toEqual(["witchr"]));
    });

    it("doesn’t look past the catalogue when the catalogue has it", async () => {
        const reached = vi.fn();
        server.use(
            http.get(`${API_BASE}/games`, () =>
                HttpResponse.json(
                    paginated([buildGame({ id: 9, title: "Pentiment" })])
                )
            ),
            http.get(`${API_BASE}/games/search`, () => {
                reached();
                return HttpResponse.json(paginated([]));
            })
        );
        renderWithProviders(
            <PlayedGamesStep titleId="t" preview onDone={vi.fn()} />
        );
        const u = userEvent.setup();

        await u.type(screen.getByLabelText("Search for a game"), "pentiment");

        await screen.findByRole("button", { name: "Pentiment" });
        await waitFor(() =>
            expect(screen.getByRole("list")).toHaveAttribute(
                "aria-busy",
                "false"
            )
        );
        expect(reached).not.toHaveBeenCalled();
    });
});
