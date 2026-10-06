import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../../../test/msw/server";
import { buildProfile } from "../../../test/msw/handlers";
import { renderWithProviders } from "../../../test/renderWithProviders";
import EditProfilePopup from "./EditProfilePopup";

const compressAvatar = vi.hoisted(() => vi.fn());
vi.mock("../../../lib/avatarImage", () => ({ compressAvatar }));

const API = "http://localhost:3000/api/v1";

const calls: string[] = [];
let avatarStatus = 200;

beforeEach(() => {
    calls.length = 0;
    avatarStatus = 200;
    URL.createObjectURL = vi.fn(() => "blob:preview");
    URL.revokeObjectURL = vi.fn();
    compressAvatar.mockResolvedValue(
        new Blob(["small"], { type: "image/jpeg" })
    );
    server.use(
        http.patch(`${API}/profiles/me`, async ({ request }) => {
            const body = (await request.json()) as { bio: string };
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
});
