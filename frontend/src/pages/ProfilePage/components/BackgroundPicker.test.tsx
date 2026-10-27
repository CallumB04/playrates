import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { GameBackdrop } from "@playrates/shared";
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

beforeEach(() => {
    calls.length = 0;
    server.use(
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
    return { onClose, user: userEvent.setup() };
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
        await user.keyboard(
            "{PageDown}{PageDown}{PageDown}{PageDown}{PageDown}"
        );
        expect(slider).toHaveAttribute("aria-valuenow", "80");
        await user.click(
            screen.getByRole("button", { name: "Use this picture" })
        );

        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(calls).toEqual(["put:1:https://img.test/big/2.jpg:80"]);
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

        expect(
            screen.getByRole("searchbox", { name: "Search your games" })
        ).toBeInTheDocument();
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
