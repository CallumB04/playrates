import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../../../test/msw/server";
import { buildProfile, buildProgress } from "../../../test/msw/handlers";
import { renderWithProviders } from "../../../test/renderWithProviders";
import EditProfilePopup from "./EditProfilePopup";

const compressAvatar = vi.hoisted(() => vi.fn());
vi.mock("../../../lib/avatarImage", () => ({ compressAvatar }));
vi.mock("../../../contexts/AuthContext", () => ({
    useAuth: () => ({ user: buildProfile() }),
    useUser: () => buildProfile(),
}));

const API = "http://localhost:3000/api/v1";

const calls: string[] = [];
let avatarStatus = 200;
let sent: Record<string, unknown> | null = null;

beforeEach(() => {
    calls.length = 0;
    sent = null;
    avatarStatus = 200;
    URL.createObjectURL = vi.fn(() => "blob:preview");
    URL.revokeObjectURL = vi.fn();
    compressAvatar.mockResolvedValue(
        new Blob(["small"], { type: "image/jpeg" })
    );
    server.use(
        http.patch(`${API}/profiles/me`, async ({ request }) => {
            const body = (await request.json()) as { bio: string };
            sent = body;
            calls.push(`patch:${body.bio}`);
            return HttpResponse.json(buildProfile({ bio: body.bio }));
        }),
        http.post(`${API}/profiles/me/avatar`, ({ request }) => {
            calls.push(`avatar:${request.headers.get("Content-Type")}`);
            return avatarStatus === 200
                ? HttpResponse.json(
                      buildProfile({ avatarUrl: "https://cdn/avatar.webp?v=2" })
                  )
                : HttpResponse.json(
                      {
                          error: {
                              code: "bad_request",
                              message: "That picture could not be read",
                          },
                      },
                      { status: avatarStatus }
                  );
        })
    );
});

const setup = () => {
    const closePopup = vi.fn();
    renderWithProviders(
        <EditProfilePopup closePopup={closePopup} user={buildProfile()} />
    );
    return { closePopup };
};

const pickPictureAndBio = async () => {
    const user = userEvent.setup();
    await user.upload(
        document.querySelector<HTMLInputElement>("input[type=file]")!,
        new File(["bytes"], "IMG_0001.HEIC", { type: "image/heic" })
    );
    await screen.findByText("Save changes to apply this.");
    const bio = screen.getByLabelText("Bio");
    await user.clear(bio);
    await user.type(bio, "New bio");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
};

describe("EditProfilePopup", () => {
    it("saves the words and the picture, then closes", async () => {
        const { closePopup } = setup();

        await pickPictureAndBio();

        await waitFor(() => expect(closePopup).toHaveBeenCalledOnce());
        expect(calls).toEqual(["patch:New bio", "avatar:image/jpeg"]);
    });

    it("keeps the words and says why when the picture is turned away", async () => {
        avatarStatus = 400;
        const { closePopup } = setup();

        await pickPictureAndBio();

        expect(
            await screen.findByText("That picture could not be read")
        ).toBeInTheDocument();
        expect(calls).toEqual(["patch:New bio", "avatar:image/jpeg"]);
        expect(closePopup).not.toHaveBeenCalled();
    });

    /* The colour only fills the initial a profile shows without a picture. */
    it("offers a colour only while there is no picture", async () => {
        const user = userEvent.setup();
        renderWithProviders(
            <EditProfilePopup
                closePopup={vi.fn()}
                user={buildProfile({ avatarUrl: "https://cdn/avatar.webp" })}
            />
        );
        const colour = () =>
            screen.queryByRole("radiogroup", {
                name: "Colour behind your initial",
            });

        expect(colour()).toBeNull();
        await user.click(screen.getByRole("button", { name: /Remove/ }));
        expect(colour()).toBeInTheDocument();

        await user.upload(
            document.querySelector<HTMLInputElement>("input[type=file]")!,
            new File(["bytes"], "IMG_0001.HEIC", { type: "image/heic" })
        );
        await screen.findByText("Save changes to apply this.");
        expect(colour()).toBeNull();
    });

    it("saves what was typed on another view with the rest", async () => {
        const { closePopup } = setup();
        const user = userEvent.setup();

        await user.click(screen.getByRole("tab", { name: "About you" }));
        await user.type(screen.getByLabelText("Pronouns"), "they/them");
        await user.click(screen.getByRole("button", { name: "Save changes" }));

        await waitFor(() => expect(closePopup).toHaveBeenCalledOnce());
        expect(sent).toMatchObject({ pronouns: "they/them" });
    });

    /* Save is off while a field is wrong; the dot says which view it's on. */
    it("marks the view holding a field that needs fixing", async () => {
        setup();
        const user = userEvent.setup();

        await user.click(screen.getByRole("tab", { name: "Socials" }));
        await user.type(screen.getByLabelText("Website"), "not a website");
        await user.click(screen.getByRole("tab", { name: "Profile" }));

        expect(
            screen.getByRole("tab", { name: /^Socials/ })
        ).toHaveAccessibleName("Socials (needs a look)");
        expect(
            screen.getByRole("button", { name: "Save changes" })
        ).toBeDisabled();
    });

    it("wears what's owned and reorders the profile, with the one Save", async () => {
        const base = buildProgress();
        let style: Record<string, unknown> | null = null;
        server.use(
            http.get(`${API}/me/progress`, () =>
                HttpResponse.json({
                    ...base,
                    look: { ...base.look, fonts: ["default", "silkscreen"] },
                })
            ),
            http.patch(`${API}/me/progress/style`, async ({ request }) => {
                style = (await request.json()) as Record<string, unknown>;
                return new HttpResponse(null, { status: 204 });
            })
        );
        const { closePopup } = setup();
        const user = userEvent.setup();

        await user.click(screen.getByRole("tab", { name: "Look" }));
        await user.click(
            await screen.findByRole("button", { name: "Arcade font" })
        );
        await user.click(
            screen.getByRole("button", { name: "Move Favourite games up" })
        );
        await user.click(screen.getByRole("button", { name: "Save changes" }));

        await waitFor(() => expect(closePopup).toHaveBeenCalled());
        expect(style).toEqual({ nameFont: "silkscreen" });
        expect(sent).toMatchObject({
            sectionOrder: [
                "pinned_reviews",
                "favourites",
                "pinned_lists",
                "wishlist",
            ],
        });
    });
});
