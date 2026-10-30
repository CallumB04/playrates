import { describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { GameListDetail } from "@playrates/shared";
import { server } from "../../../test/msw/server";
import { buildProfile, paginated } from "../../../test/msw/handlers";
import { renderWithProviders } from "../../../test/renderWithProviders";
import PinnedLists from "./PinnedLists";

// The same user each render, as AuthContext gives it: a new one each time
// would hand usePins new pins to sync on every render.
const auth = vi.hoisted(() => ({ user: null as unknown }));
vi.mock("../../../contexts/AuthContext", () => ({ useAuth: () => auth }));
auth.user = buildProfile({ username: "devuser" });

const API = "http://localhost:3000/api/v1";

const list = (
    id: number,
    name: string,
    visibility: GameListDetail["visibility"] = "everyone"
): GameListDetail => ({
    id,
    name,
    description: "",
    visibility,
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
        renderWithProviders(
            <PinnedLists username="ana" ids={[1, 2]} isOwner={false} />
        );
        expect(await screen.findByText("Cosy games")).toBeInTheDocument();
    });

    // It used to stand there empty for anyone the lists were hidden from.
    it("leaves the card out when none of them can be shown", async () => {
        serve({});
        renderWithProviders(
            <PinnedLists username="ana" ids={[2]} isOwner={false} />
        );
        await new Promise((r) => setTimeout(r, 100));
        expect(screen.queryByText("Pinned lists")).toBeNull();
    });

    describe("on your own profile", () => {
        const own = (lists: GameListDetail[]) =>
            server.use(
                http.get(`${API}/users/:username/lists`, () =>
                    HttpResponse.json(paginated(lists))
                )
            );

        it("chooses which lists to pin, from the ones everyone can see", async () => {
            serve({});
            own([list(1, "Cosy games"), list(2, "Secret", "private")]);
            const saved = vi.fn();
            server.use(
                http.patch(`${API}/me/progress/style`, async ({ request }) => {
                    saved(await request.json());
                    return HttpResponse.json({});
                })
            );
            const u = userEvent.setup();
            renderWithProviders(
                <PinnedLists username="devuser" ids={[]} isOwner />
            );

            expect(
                await screen.findByText(/Pin up to 1 of your lists here/)
            ).toBeInTheDocument();
            await u.click(screen.getByRole("button", { name: "Choose" }));
            const dialog = await screen.findByRole("dialog");
            expect(within(dialog).queryByText("Secret")).toBeNull();
            await u.click(
                within(dialog).getByRole("button", { name: /Cosy games/ })
            );
            await u.click(within(dialog).getByRole("button", { name: "Save" }));

            await waitFor(() =>
                expect(saved).toHaveBeenCalledWith({ pinnedLists: [1] })
            );
        });

        it("offers another slot once they're all taken, without leaving", async () => {
            serve({});
            own([list(1, "Cosy games"), list(2, "Hard ones")]);
            server.use(
                http.get(`${API}/progress/devuser/badges`, () =>
                    HttpResponse.json({
                        level: 3,
                        xp: 400,
                        frame: null,
                        held: [],
                        showcase: [],
                        layout: "row",
                        progress: [],
                    })
                ),
                http.get(`${API}/shop`, () =>
                    HttpResponse.json({
                        tokens: 200,
                        items: [
                            {
                                item: "slot_pinned_list",
                                kind: "slot",
                                group: "slot",
                                label: "Pinned lists",
                                price: 150,
                                owned: 0,
                                maxOwned: 2,
                                affordable: true,
                            },
                        ],
                    })
                )
            );
            const u = userEvent.setup();
            renderWithProviders(
                <PinnedLists username="devuser" ids={[]} isOwner />
            );

            await u.click(
                await screen.findByRole("button", { name: "Choose" })
            );
            const picker = await screen.findByRole("dialog");
            expect(
                within(picker).queryByRole("button", {
                    name: "Get another slot",
                })
            ).toBeNull();
            await u.click(
                within(picker).getByRole("button", { name: /Cosy games/ })
            );
            await u.click(
                within(picker).getByRole("button", {
                    name: "Get another slot",
                })
            );

            // The slot's popup, over the picker rather than instead of it.
            await waitFor(() =>
                expect(screen.getAllByRole("dialog")).toHaveLength(2)
            );
            expect(screen.getAllByRole("dialog")[1]).toHaveTextContent(
                "Profile slot"
            );
        });

        it("stays out of the way with no list that could be pinned", async () => {
            serve({});
            own([list(2, "Secret", "private")]);
            renderWithProviders(
                <PinnedLists username="devuser" ids={[]} isOwner />
            );
            await new Promise((r) => setTimeout(r, 100));
            expect(screen.queryByText("Pinned lists")).toBeNull();
        });

        // A gifted slot's notification links here to pick what goes in it.
        it("opens the picker when the link asks", async () => {
            serve({});
            own([list(1, "Cosy games")]);
            renderWithProviders(
                <PinnedLists username="devuser" ids={[]} isOwner />,
                { route: "/user/devuser?edit=pinned_lists" }
            );
            expect(
                await screen.findByText(/in the order you want them/)
            ).toBeInTheDocument();
        });
    });
});
