import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { AdminPatchNote } from "@playrates/shared";
import { server } from "../../../test/msw/server";
import { renderWithProviders } from "../../../test/renderWithProviders";
import PatchNotesSection from "./PatchNotesSection";

const API = "http://localhost:3000/api/v1";

const note = (
    messageId: number,
    title: string | null,
    sent = false
): AdminPatchNote => ({
    messageId,
    threadId: 7,
    title,
    createdAt: "2026-09-26T10:00:00Z",
    editedAt: null,
    link: `/community/thread/7#message-${messageId}`,
    announcement: sent
        ? {
              id: 1,
              tone: "update",
              title: `New patch notes: ${title}`,
              body: "…",
              link: null,
              createdAt: "2026-09-26T11:00:00Z",
              retractedAt: null,
              recipientCount: 3,
              readCount: 2,
          }
        : null,
});

const announced = vi.fn();
const tested = vi.fn();

beforeEach(() => {
    announced.mockClear();
    tested.mockClear();
    server.use(
        http.get(`${API}/admin/patch-notes`, () =>
            HttpResponse.json([
                note(41, "v1.1 Lists"),
                note(40, "v1.0 Launch", true),
            ])
        ),
        http.get(`${API}/community/patch-notes`, () =>
            HttpResponse.json({ thread: { id: 7 }, latest: null })
        ),
        http.post(`${API}/admin/patch-notes/:id/announce`, ({ params }) => {
            announced(params.id);
            return HttpResponse.json(note(41, "v1.1 Lists", true), {
                status: 201,
            });
        }),
        http.post(`${API}/admin/patch-notes/:id/test`, ({ params }) => {
            tested(params.id);
            return new HttpResponse(null, { status: 204 });
        })
    );
});

const rowOf = async (title: string) =>
    (await screen.findByRole("link", { name: title })).closest("li")!;

describe("PatchNotesSection", () => {
    it("links each entry to its place in the notes, and says which went out", async () => {
        renderWithProviders(<PatchNotesSection reach={3} />);

        expect(
            await screen.findByRole("link", { name: "v1.1 Lists" })
        ).toHaveAttribute("href", "/community/thread/7#message-41");
        expect(
            within(await rowOf("v1.1 Lists")).getByText("Not sent yet")
        ).toBeInTheDocument();
        const sent = await rowOf("v1.0 Launch");
        expect(within(sent).getByText(/Sent/)).toBeInTheDocument();
        expect(within(sent).queryByRole("button")).not.toBeInTheDocument();
    });

    it("asks before telling everyone, quoting what they will see", async () => {
        const user = userEvent.setup();
        renderWithProviders(<PatchNotesSection reach={3} />);

        await user.click(
            within(await rowOf("v1.1 Lists")).getByRole("button", {
                name: "Send to 3 people",
            })
        );
        const dialog = await screen.findByRole("dialog");
        expect(dialog).toHaveTextContent("“New patch notes: v1.1 Lists”");
        expect(announced).not.toHaveBeenCalled();

        await user.click(within(dialog).getByRole("button", { name: "Send" }));
        await waitFor(() => expect(announced).toHaveBeenCalledWith("41"));
    });

    it("sends a test without asking, since it only reaches the admin", async () => {
        const user = userEvent.setup();
        renderWithProviders(<PatchNotesSection reach={3} />);

        await user.click(
            within(await rowOf("v1.1 Lists")).getByRole("button", {
                name: "Send test to me",
            })
        );
        await waitFor(() => expect(tested).toHaveBeenCalledWith("41"));
        expect(announced).not.toHaveBeenCalled();
    });
});
