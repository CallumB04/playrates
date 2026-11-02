import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { AdminPatchNote } from "@playrates/shared";
import { server } from "../../test/msw/server";
import { renderWithProviders } from "../../test/renderWithProviders";
import PatchNoteNotify from "./PatchNoteNotify";

const API = "http://localhost:3000/api/v1";

const note = (sent: boolean, emailed = false): AdminPatchNote => ({
    messageId: 41,
    threadId: 7,
    title: "v1.1 Lists",
    createdAt: "2026-09-26T10:00:00Z",
    editedAt: null,
    link: "/community/thread/7#message-41",
    announcement: sent
        ? {
              id: 1,
              tone: "update",
              title: "New patch notes: v1.1 Lists",
              body: "…",
              link: null,
              createdAt: "2026-09-26T11:00:00Z",
              retractedAt: null,
              recipientCount: 3,
              readCount: 0,
              emailedAt: emailed ? "2026-09-26T11:00:00Z" : null,
          }
        : null,
});

const announced = vi.fn();
const tested = vi.fn();

beforeEach(() => {
    announced.mockClear();
    tested.mockClear();
    server.use(
        http.get(`${API}/admin/email/audience`, () =>
            HttpResponse.json({ newsSubscribers: 2 })
        ),
        http.post(
            `${API}/admin/patch-notes/:id/announce`,
            async ({ params, request }) => {
                announced(params.id, await request.json());
                return HttpResponse.json(note(true), { status: 201 });
            }
        ),
        http.post(
            `${API}/admin/patch-notes/:id/test`,
            async ({ params, request }) => {
                tested(params.id, await request.json());
                return new HttpResponse(null, { status: 204 });
            }
        )
    );
});

const openPopup = (user = userEvent.setup()) =>
    user.click(screen.getByRole("button", { name: "Send notification" }));

describe("PatchNoteNotify", () => {
    it("sends to you alone unless you pick everyone", async () => {
        const user = userEvent.setup();
        renderWithProviders(<PatchNoteNotify note={note(false)} />);
        await openPopup(user);

        expect(screen.getByRole("radio", { name: "Just me" })).toBeChecked();
        await user.click(screen.getByRole("button", { name: "Send to me" }));

        await waitFor(() =>
            expect(tested).toHaveBeenCalledWith("41", { email: true })
        );
        expect(announced).not.toHaveBeenCalled();
        expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("sends without the email when it's switched off", async () => {
        const user = userEvent.setup();
        renderWithProviders(<PatchNoteNotify note={note(false)} />);
        await openPopup(user);
        await user.click(
            screen.getByRole("switch", { name: "Also send as an email" })
        );
        await user.click(screen.getByRole("button", { name: "Send to me" }));

        await waitFor(() =>
            expect(tested).toHaveBeenCalledWith("41", { email: false })
        );
    });

    it("sends to everyone, saying how many the email reaches first", async () => {
        const user = userEvent.setup();
        renderWithProviders(<PatchNoteNotify note={note(false)} />);
        await openPopup(user);
        await user.click(screen.getByRole("radio", { name: "Everyone" }));

        expect(
            await screen.findByText(/by email to 2 members/)
        ).toBeInTheDocument();
        await user.click(
            screen.getByRole("button", { name: "Send to everyone" })
        );
        await waitFor(() =>
            expect(announced).toHaveBeenCalledWith("41", { email: true })
        );
        expect(tested).not.toHaveBeenCalled();
    });

    it("says when a sent entry went out, and offers no second send", () => {
        renderWithProviders(<PatchNoteNotify note={note(true)} />);

        expect(screen.getByText(/Notified/)).toBeInTheDocument();
        expect(screen.getByText(/Notified/)).not.toHaveTextContent("emailed");
        expect(
            screen.queryByRole("button", { name: "Send notification" })
        ).not.toBeInTheDocument();
    });

    it("says when a sent entry also went out by email", () => {
        renderWithProviders(<PatchNoteNotify note={note(true, true)} />);

        expect(screen.getByText(/Notified/)).toHaveTextContent("· emailed");
    });
});
