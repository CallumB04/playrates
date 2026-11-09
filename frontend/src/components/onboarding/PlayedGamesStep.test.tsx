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
            })
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
});
