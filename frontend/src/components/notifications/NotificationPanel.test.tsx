import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { awaitingAnswer, type AppNotification } from "@playrates/shared";
import { server } from "../../test/msw/server";
import { renderWithProviders } from "../../test/renderWithProviders";
import { buildProfile } from "../../test/msw/handlers";
import NotificationPanel from "./NotificationPanel";

// The inbox is only fetched for someone signed in.
vi.mock("../../contexts/AuthContext", () => ({
    useAuth: () => ({ user: buildProfile() }),
}));

const API = "http://localhost:3000/api/v1";

const welcome = (overrides: Partial<AppNotification> = {}): AppNotification =>
    ({
        id: 1,
        kind: "welcome",
        createdAt: "2026-01-01T00:00:00.000Z",
        readAt: null,
        archivedAt: null,
        ...overrides,
    }) as AppNotification;

const inbox = (data: AppNotification[]) =>
    server.use(
        http.get(`${API}/me/notifications`, () =>
            HttpResponse.json({
                data,
                unread: data.filter((n) => n.readAt === null).length,
                awaitingAnswer: data.filter(awaitingAnswer).length,
                meta: { page: 1, limit: 20, total: data.length },
            })
        )
    );

const panel = () =>
    renderWithProviders(
        <NotificationPanel onNavigate={() => {}} titleId="t" />
    );

const READ = "2026-01-02T00:00:00.000Z";

describe("NotificationPanel", () => {
    it("offers to mark everything read while anything is unread", async () => {
        inbox([welcome(), welcome({ id: 2, readAt: READ })]);
        panel();
        expect(
            await screen.findByRole("button", { name: "Mark all read" })
        ).toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: "Archive all" })
        ).not.toBeInTheDocument();
    });

    /* Read first, then filed: the same place clears the inbox once there
       is nothing left to read. */
    it("offers to archive everything once it is all read", async () => {
        const archived = vi.fn();
        server.use(
            http.post(`${API}/me/notifications/archive-all`, () => {
                archived();
                return new HttpResponse(null, { status: 204 });
            })
        );
        inbox([welcome({ readAt: READ }), welcome({ id: 2, readAt: READ })]);
        panel();

        await userEvent.click(
            await screen.findByRole("button", { name: "Archive all" })
        );
        await waitFor(() => expect(archived).toHaveBeenCalled());
        expect(
            screen.queryByRole("button", { name: "Mark all read" })
        ).not.toBeInTheDocument();
    });

    /* A request waiting on an answer stays unread whatever is pressed, so
       counting it would leave "Mark all read" there for good. */
    it("does not count a waiting friend request as something to read", async () => {
        const request = welcome({
            id: 3,
            kind: "friend_request",
            relation: "request-received",
            actor: {
                id: "u2",
                username: "frostbyte",
                avatarUrl: null,
                accent: "indigo",
            },
        } as unknown as Partial<AppNotification>);
        inbox([request, welcome({ readAt: READ })]);
        panel();

        expect(
            await screen.findByRole("button", { name: "Archive all" })
        ).toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: "Mark all read" })
        ).toBeNull();
    });

    it("offers neither with nothing in the inbox", async () => {
        inbox([]);
        panel();
        expect(await screen.findByText(/Nothing new/)).toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: "Archive all" })
        ).toBeNull();
        expect(
            screen.queryByRole("button", { name: "Mark all read" })
        ).toBeNull();
    });

    /* From the archive it would act on rows that are not on screen. */
    it("offers nothing in the archive", async () => {
        inbox([welcome({ readAt: READ, archivedAt: READ })]);
        panel();
        await userEvent.click(
            await screen.findByRole("radio", { name: "Archive" })
        );
        expect(
            screen.queryByRole("button", { name: "Archive all" })
        ).toBeNull();
    });
});
