import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { AdminPatchNote } from "@playrates/shared";
import { server } from "../../test/msw/server";
import { renderWithProviders } from "../../test/renderWithProviders";
import PatchNoteNotify from "./PatchNoteNotify";

const API = "http://localhost:3000/api/v1";

const note = (sent: boolean): AdminPatchNote => ({
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
          }
        : null,
});

const announced = vi.fn();

beforeEach(() => {
    announced.mockClear();
    server.use(
        http.post(`${API}/admin/patch-notes/:id/announce`, ({ params }) => {
            announced(params.id);
            return HttpResponse.json(note(true), { status: 201 });
        })
    );
});

describe("PatchNoteNotify", () => {
    it("sends the entry to everyone once it is confirmed", async () => {
        renderWithProviders(<PatchNoteNotify note={note(false)} />);

        await userEvent.click(
            screen.getByRole("button", { name: "Send notification" })
        );
        expect(announced).not.toHaveBeenCalled();
        await userEvent.click(screen.getByRole("button", { name: "Send" }));

        await waitFor(() => expect(announced).toHaveBeenCalledWith("41"));
    });

    it("says when a sent entry went out, and offers no second send", () => {
        renderWithProviders(<PatchNoteNotify note={note(true)} />);

        expect(screen.getByText(/Notified/)).toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: "Send notification" })
        ).not.toBeInTheDocument();
    });
});
