import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { SetupStepKey } from "@playrates/shared";
import { server } from "../../test/msw/server";
import {
    buildGame,
    buildGameLog,
    buildProfile,
    buildShelfEntry,
    paginated,
} from "../../test/msw/handlers";
import { renderWithProviders } from "../../test/renderWithProviders";
import SetupStepSheet from "./SetupStepSheet";

const API = "http://localhost:3000/api/v1";

vi.mock("../../contexts/AuthContext", () => ({
    useAuth: () => ({ user: buildProfile({ username: "kai", bio: "" }) }),
}));

let writes: { method: string; url: string; body: unknown }[];

beforeEach(() => {
    writes = [];
    const record =
        (reply: () => Response) =>
        async ({ request }: { request: Request }) => {
            const text = await request.text();
            writes.push({
                method: request.method,
                url: new URL(request.url).pathname.replace("/api/v1", ""),
                body: text ? JSON.parse(text) : null,
            });
            return reply();
        };
    server.use(
        http.patch(
            `${API}/profiles/me`,
            record(() => HttpResponse.json(buildProfile()))
        ),
        http.post(
            `${API}/me/logs`,
            record(() => HttpResponse.json(buildGameLog()))
        ),
        http.put(
            `${API}/me/logs/:id/review`,
            record(() => HttpResponse.json({}))
        ),
        http.put(
            `${API}/me/favourites`,
            record(() => HttpResponse.json([]))
        ),
        http.post(
            `${API}/me/friends/requests`,
            record(() => HttpResponse.json({}))
        ),
        http.get(`${API}/users/:username/favourites`, () =>
            HttpResponse.json([])
        ),
        http.get(`${API}/me/friends/matches`, () =>
            HttpResponse.json({ data: [] })
        ),
        http.get(`${API}/me/friends/shared`, () =>
            HttpResponse.json({ data: [] })
        ),
        http.get(`${API}/games/search`, () =>
            HttpResponse.json({ data: [], meta: {} })
        )
    );
});

const open = (step: SetupStepKey) => {
    const onClose = vi.fn();
    renderWithProviders(<SetupStepSheet step={step} onClose={onClose} />);
    return onClose;
};

describe("SetupStepSheet", () => {
    it("says what the step is and what it's worth", async () => {
        open("review");
        expect(
            screen.getByRole("heading", { name: "Write your first review" })
        ).toBeInTheDocument();
        expect(await screen.findByText("+15 XP")).toBeInTheDocument();
    });

    it("lets it wait, writing nothing", async () => {
        const onClose = open("bio");
        await userEvent.click(
            screen.getByRole("button", { name: "Skip for now" })
        );
        expect(onClose).toHaveBeenCalled();
        expect(writes).toEqual([]);
    });

    it("saves a bio", async () => {
        const onClose = open("bio");
        await userEvent.type(
            screen.getByLabelText("Bio"),
            "Souls games and cosy sims"
        );
        await userEvent.click(screen.getByRole("button", { name: "Save bio" }));
        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(writes).toEqual([
            {
                method: "PATCH",
                url: "/profiles/me",
                body: { bio: "Souls games and cosy sims" },
            },
        ]);
    });

    it("posts a review of a game they've played", async () => {
        const onClose = open("review");
        await userEvent.type(
            await screen.findByLabelText(
                "Your review of The Witcher 3: Wild Hunt"
            ),
            "good"
        );
        await userEvent.click(
            screen.getByRole("button", { name: "Post review" })
        );
        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(writes[0]).toMatchObject({
            method: "PUT",
            url: "/me/logs/10/review",
            body: { body: "good", isPublic: true },
        });
    });

    it("asks for a game first when there's nothing to review", async () => {
        server.use(
            http.get(`${API}/me/shelf`, () => HttpResponse.json(paginated([])))
        );
        open("review");
        expect(
            await screen.findByRole("button", { name: "Add a game" })
        ).toBeInTheDocument();
    });

    it("rates their unrated games, and is done once one has a rating", async () => {
        server.use(
            http.get(`${API}/me/shelf`, () =>
                HttpResponse.json(
                    paginated([
                        buildShelfEntry([
                            buildGameLog({ id: 31, rating: null }),
                        ]),
                    ])
                )
            )
        );
        server.use(
            http.patch(`${API}/me/logs/:id`, () =>
                HttpResponse.json(buildGameLog())
            )
        );
        const onClose = open("rate");
        const done = screen.getByRole("button", { name: "Done" });
        expect(done).toBeDisabled();
        const meter = await screen.findByRole("slider", {
            name: "The Witcher 3: Wild Hunt",
        });
        meter.focus();
        await userEvent.keyboard("{End}");
        await userEvent.click(done);
        expect(onClose).toHaveBeenCalled();
    });

    it("sends a friend request to someone found by name", async () => {
        server.use(
            http.get(`${API}/profiles`, () =>
                HttpResponse.json(
                    paginated([
                        buildProfile({ id: "u-2", username: "halcyon" }),
                    ])
                )
            )
        );
        open("friend");
        await userEvent.type(screen.getByLabelText("Find someone"), "halc");
        await userEvent.click(
            await screen.findByRole("button", { name: "Add" })
        );
        await waitFor(() =>
            expect(writes).toContainEqual({
                method: "POST",
                url: "/me/friends/requests",
                body: { userId: "u-2" },
            })
        );
    });

    it("saves the favourites picked, up to six", async () => {
        server.use(
            http.get(`${API}/users/:username/favourites`, () =>
                HttpResponse.json([buildGame({ id: 7, title: "Outer Wilds" })])
            )
        );
        const onClose = open("favourites");
        expect(
            await screen.findByRole("button", { name: "Take off Outer Wilds" })
        ).toBeInTheDocument();
        await userEvent.click(
            screen.getByRole("button", { name: "Save favourites" })
        );
        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(writes[0]).toMatchObject({
            method: "PUT",
            url: "/me/favourites",
        });
    });

    it("lists posts to reply to, each leading to the post itself", async () => {
        const thread = (id: number, title: string) => ({
            id,
            title,
            subject: {
                kind: "game",
                game: {
                    id: 1,
                    title: "Elden Ring",
                    slug: "elden-ring",
                    coverUrl: null,
                    artworkUrl: null,
                    hasSexualContent: false,
                },
            },
            author: null,
            createdAt: "2026-11-01T00:00:00.000Z",
            lastActivityAt: "2026-11-12T00:00:00.000Z",
            messageCount: 12,
            contributorCount: 4,
            contributors: [],
            recentMessageCount: 6,
            rank: id,
            activity: [],
        });
        server.use(
            http.get(`${API}/community/trending`, () =>
                HttpResponse.json([
                    thread(1, "Best boss?"),
                    thread(2, "Hardest area?"),
                ])
            )
        );
        const onClose = open("post");
        expect(
            screen.getByRole("radio", { name: "Start a post" })
        ).toHaveAttribute("aria-checked", "true");
        await userEvent.click(
            screen.getByRole("radio", { name: "Reply to a post" })
        );
        // To the post itself, to read it before replying.
        const link = await screen.findByRole("link", {
            name: /Hardest area\?/,
        });
        expect(link).toHaveAttribute("href", "/community/thread/2");
        await userEvent.click(link);
        expect(onClose).toHaveBeenCalled();
    });

    it("says what step of setup it is, above the thing to do", async () => {
        open("favourites");
        expect(
            screen.getByRole("heading", { name: "Add favourite games" })
        ).toBeInTheDocument();
        expect(await screen.findByText("Get started")).toBeInTheDocument();
    });

    it("fills the place tapped, and trades two places dragged one onto the other", async () => {
        server.use(
            http.get(`${API}/users/:username/favourites`, () =>
                HttpResponse.json([
                    buildGame({ id: 7, title: "Outer Wilds" }),
                    buildGame({ id: 8, title: "Hades" }),
                ])
            )
        );
        const onClose = open("favourites");
        const first = await screen.findByRole("button", {
            name: "Number 1: Outer Wilds",
        });

        // A tap only chooses where the search goes.
        await userEvent.click(
            screen.getByRole("button", { name: "Number 4: empty" })
        );
        expect(screen.getByLabelText("Game for #4")).toBeInTheDocument();

        const second = screen.getByRole("button", { name: "Number 2: Hades" });
        const original = document.elementFromPoint;
        document.elementFromPoint = () => second;
        try {
            fireEvent.pointerDown(first, {
                pointerType: "mouse",
                button: 0,
                clientX: 0,
                clientY: 0,
            });
            fireEvent.pointerMove(window, {
                pointerType: "mouse",
                clientX: 40,
                clientY: 0,
            });
            fireEvent.pointerUp(window, { pointerType: "mouse" });
        } finally {
            document.elementFromPoint = original;
        }
        expect(
            screen.getByRole("button", { name: "Number 1: Hades" })
        ).toBeInTheDocument();

        await userEvent.click(
            screen.getByRole("button", { name: "Save favourites" })
        );
        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(writes[0]).toMatchObject({
            url: "/me/favourites",
            body: { gameIds: [8, 7] },
        });
    });

    it("leaves the favourites already picked out of the search", async () => {
        server.use(
            http.get(`${API}/users/:username/favourites`, () =>
                HttpResponse.json([buildGame({ id: 7, title: "Outer Wilds" })])
            ),
            http.get(`${API}/games/search`, () =>
                HttpResponse.json({
                    data: [
                        buildGame({ id: 7, title: "Outer Wilds" }),
                        buildGame({ id: 9, title: "Outer Worlds" }),
                    ],
                    meta: {},
                })
            )
        );
        open("favourites");
        await userEvent.type(
            await screen.findByLabelText("Game for #2"),
            "outer"
        );
        expect(
            await screen.findByRole("option", { name: /Outer Worlds/ })
        ).toBeInTheDocument();
        expect(
            screen.queryByRole("option", { name: /Outer Wilds/ })
        ).toBeNull();
    });

    it("waits with all six picked, until one is chosen to change", async () => {
        server.use(
            http.get(`${API}/users/:username/favourites`, () =>
                HttpResponse.json(
                    [1, 2, 3, 4, 5, 6].map((id) =>
                        buildGame({ id, title: `Game ${id}` })
                    )
                )
            )
        );
        open("favourites");
        const search = await screen.findByLabelText("Change a game");
        expect(search).toBeDisabled();
        expect(
            screen.getByRole("button", { name: "Number 3: Game 3" })
        ).toHaveAttribute("aria-pressed", "false");

        await userEvent.click(
            screen.getByRole("button", { name: "Number 3: Game 3" })
        );
        expect(screen.getByLabelText("Game for #3")).toBeEnabled();
    });

    it("suggests people who play what you play, and closes on the way to one", async () => {
        server.use(
            http.get(`${API}/me/friends/shared`, () =>
                HttpResponse.json({
                    data: [
                        {
                            user: {
                                id: "u-3",
                                username: "halcyon",
                                avatarUrl: null,
                                accent: "indigo",
                                bio: "",
                                online: false,
                            },
                            shared: 4,
                            games: [],
                        },
                    ],
                })
            )
        );
        const onClose = open("friend");
        expect(
            await screen.findByText("Most in common")
        ).toBeInTheDocument();
        expect(screen.getByText("4 games in common")).toBeInTheDocument();
        await userEvent.click(screen.getByRole("link", { name: /halcyon/ }));
        expect(onClose).toHaveBeenCalled();
    });

    it("points to the People page and the community for more", async () => {
        open("friend");
        expect(
            await screen.findByRole("link", { name: "People page" })
        ).toHaveAttribute("href", "/people");
        expect(screen.getByRole("link", { name: "community" })).toHaveAttribute(
            "href",
            "/community"
        );
    });
});
