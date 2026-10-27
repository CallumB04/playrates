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
            };
            calls.push(`put:${body.gameId}:${body.url}`);
            return HttpResponse.json(
                buildProfile({ background: { url: body.url, gameId: 1 } })
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
    it("takes a game you've logged, then one of its pictures", async () => {
        const { onClose, user } = setup();

        await user.click(
            await screen.findByRole("button", {
                name: /The Witcher 3: Wild Hunt/,
            })
        );
        const save = screen.getByRole("button", { name: "Use this picture" });
        // Nothing to save until a picture is picked.
        expect(save).toBeDisabled();

        await user.click(
            await screen.findByRole("button", { name: "Picture 2" })
        );
        await user.click(save);

        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(calls).toEqual(["put:1:https://img.test/big/2.jpg"]);
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
                background: { url: PICTURES[0]!.url, gameId: 1 },
            })
        );

        await user.click(
            await screen.findByRole("button", {
                name: /The Witcher 3: Wild Hunt/,
            })
        );

        expect(
            await screen.findByRole("button", { name: "Picture 1" })
        ).toHaveAttribute("aria-pressed", "true");
    });

    it("offers the colour back only once there is a picture", async () => {
        setup();
        await screen.findByRole("button", { name: /The Witcher 3/ });
        expect(
            screen.queryByRole("button", { name: "Use your colour instead" })
        ).toBeNull();
    });

    it("goes back to the colour", async () => {
        const { onClose, user } = setup(
            buildProfile({
                background: { url: PICTURES[0]!.url, gameId: 1 },
            })
        );

        await user.click(
            screen.getByRole("button", { name: "Use your colour instead" })
        );

        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(calls).toEqual(["delete"]);
    });
});
