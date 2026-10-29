import { backgroundPrice } from "@playrates/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { Backgrounds, GameBackdrop } from "@playrates/shared";
import { server } from "../../../test/msw/server";
import { buildProfile } from "../../../test/msw/handlers";
import { renderWithProviders } from "../../../test/renderWithProviders";
import BackgroundPicker from "./BackgroundPicker";

const API = "http://localhost:3000/api/v1";

const PICTURES: GameBackdrop[] = [
    { url: "https://img.test/big/1.jpg", thumbUrl: "https://img.test/s/1.jpg" },
    { url: "https://img.test/big/2.jpg", thumbUrl: "https://img.test/s/2.jpg" },
];

const calls: string[] = [];

vi.mock("../../../contexts/AuthContext", () => ({
    useAuth: () => ({ user: buildProfile() }),
    useUser: () => buildProfile(),
}));

/** What GET /me/backgrounds answers: both pictures owned by default. */
let backgrounds: Backgrounds;

beforeEach(() => {
    calls.length = 0;
    backgrounds = {
        unlocked: true,
        credits: 0,
        tokens: 100,
        games: [
            {
                gameId: 1,
                title: "The Witcher 3: Wild Hunt",
                coverUrl: null,
                urls: PICTURES.map((p) => p.url),
            },
        ],
    };
    server.use(
        http.get(`${API}/me/backgrounds`, () => HttpResponse.json(backgrounds)),
        http.post(`${API}/me/backgrounds`, async ({ request }) => {
            const body = (await request.json()) as {
                gameId: number;
                url: string;
            };
            calls.push(`buy:${body.gameId}:${body.url}`);
            backgrounds.games[0]!.urls.push(body.url);
            return HttpResponse.json({ tokens: 10, cost: 20 });
        }),
        http.get(`${API}/games/:id/backdrops`, () =>
            HttpResponse.json(PICTURES)
        ),
        http.put(`${API}/profiles/me/background`, async ({ request }) => {
            const body = (await request.json()) as {
                gameId: number;
                url: string;
                position: number;
            };
            calls.push(`put:${body.gameId}:${body.url}:${body.position}`);
            return HttpResponse.json(
                buildProfile({
                    background: {
                        url: body.url,
                        gameId: 1,
                        position: body.position,
                    },
                })
            );
        }),
        http.delete(`${API}/profiles/me/background`, () => {
            calls.push("delete");
            return HttpResponse.json(buildProfile());
        })
    );
});

const setup = (profile = buildProfile()) => {
    const onClose = vi.fn();
    renderWithProviders(
        <BackgroundPicker profile={profile} onClose={onClose} />
    );
    /* No pause between events: the flow below is a dozen of them, and with
       each one waiting on a timer it outran the 5s limit on a busy run. */
    return { onClose, user: userEvent.setup({ delay: null }) };
};

describe("BackgroundPicker", () => {
    const openGame = async (user: ReturnType<typeof userEvent.setup>) =>
        user.click(
            await screen.findByRole("button", {
                name: /The Witcher 3: Wild Hunt/,
            })
        );

    it("takes a game you've logged, one of its pictures, and the part that shows", async () => {
        const { onClose, user } = setup();

        await openGame(user);
        // Nothing to save until a picture is picked.
        expect(
            screen.queryByRole("button", { name: "Use this picture" })
        ).toBeNull();

        await user.click(
            await screen.findByRole("button", { name: "Picture 2" })
        );
        const slider = screen.getByRole("slider", {
            name: "Which part of the picture shows",
        });
        // A fresh picture starts just above the middle.
        expect(slider).toHaveAttribute("aria-valuenow", "30");
        slider.focus();
        await user.keyboard("{PageDown}{PageDown}");
        expect(slider).toHaveAttribute("aria-valuenow", "50");
        await user.click(
            screen.getByRole("button", { name: "Use this picture" })
        );

        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(calls).toEqual(["put:1:https://img.test/big/2.jpg:50"]);
    });

    it("jumps to the top, centre or bottom", async () => {
        const { user } = setup();

        await openGame(user);
        await user.click(
            await screen.findByRole("button", { name: "Picture 1" })
        );
        await user.click(screen.getByRole("radio", { name: "Bottom" }));

        expect(
            screen.getByRole("slider", {
                name: "Which part of the picture shows",
            })
        ).toHaveAttribute("aria-valuenow", "100");
        expect(screen.getByRole("radio", { name: "Bottom" })).toBeChecked();
    });

    it("goes back from the crop to the pictures", async () => {
        const { user } = setup();

        await openGame(user);
        await user.click(
            await screen.findByRole("button", { name: "Picture 1" })
        );
        await user.click(
            screen.getByRole("button", { name: "Back to the pictures" })
        );

        expect(
            screen.getByRole("button", { name: "Picture 2" })
        ).toBeInTheDocument();
    });

    it("goes back to the games without saving", async () => {
        const { user } = setup();

        await user.click(
            await screen.findByRole("button", {
                name: /The Witcher 3: Wild Hunt/,
            })
        );
        await user.click(
            screen.getByRole("button", { name: "Back to your games" })
        );

        expect(screen.getByRole("radio", { name: "Yours" })).toBeChecked();
        expect(calls).toEqual([]);
    });

    it("opens a game's pictures on the one already worn", async () => {
        const { user } = setup(
            buildProfile({
                background: { url: PICTURES[0]!.url, gameId: 1, position: 70 },
            })
        );

        await user.click(
            await screen.findByRole("button", {
                name: /The Witcher 3: Wild Hunt/,
            })
        );

        const worn = await screen.findByRole("button", { name: "Picture 1" });
        expect(worn).toHaveAttribute("aria-pressed", "true");

        // And reopens the crop where its owner left it.
        await user.click(worn);
        expect(
            screen.getByRole("slider", {
                name: "Which part of the picture shows",
            })
        ).toHaveAttribute("aria-valuenow", "70");
    });

    it("offers removal only once there is a picture", async () => {
        setup();
        await screen.findByRole("button", { name: /The Witcher 3/ });
        expect(
            screen.queryByRole("button", { name: "Remove background" })
        ).toBeNull();
    });

    it("stays shut below its level, and says when it opens", async () => {
        backgrounds = { ...backgrounds, unlocked: false, games: [] };
        setup(buildProfile({ level: 2 }));

        expect(
            await screen.findByRole("heading", { name: /open at level 3/ })
        ).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /Witcher/ })).toBeNull();
    });

    // Cropped first, then bought and worn in one press: closing half way
    // used to leave the picture bought and the background unchanged.
    it("crops a picture not yet owned, then buys and wears it at once", async () => {
        backgrounds.games[0]!.urls = [PICTURES[0]!.url];
        const { user } = setup();

        await openGame(user);
        // One owned from this game already, so the next costs a step more.
        await user.click(
            await screen.findByRole("button", {
                name: `Picture 2, ${backgroundPrice(1)} tokens`,
            })
        );
        expect(
            screen.getByRole("slider", {
                name: "Which part of the picture shows",
            })
        ).toBeInTheDocument();
        expect(
            screen.getByText(`${100 - backgroundPrice(1)} left after`)
        ).toBeInTheDocument();
        expect(calls).toEqual([]);

        await user.click(screen.getByRole("button", { name: /Buy for/ }));
        await waitFor(() => expect(calls).toHaveLength(2));
        expect(calls[0]).toBe(`buy:1:${PICTURES[1]!.url}`);
    });

    it("offers the free picture first", async () => {
        backgrounds = { ...backgrounds, credits: 1, games: [] };
        const { user } = setup();

        await openGame(user);
        await user.click(
            await screen.findByRole("button", { name: "Picture 1, free" })
        );
        expect(
            screen.getByRole("button", { name: "Use your free picture" })
        ).toBeInTheDocument();
    });

    it("removes the picture", async () => {
        const { onClose, user } = setup(
            buildProfile({
                background: { url: PICTURES[0]!.url, gameId: 1, position: 70 },
            })
        );

        await user.click(
            screen.getByRole("button", { name: "Remove background" })
        );

        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(calls).toEqual(["delete"]);
    });
});
