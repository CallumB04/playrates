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

/** The inbox the API sends, and a recorder for the bell being opened.
 *  Opened, it counts nothing as new any more, as the server does. */
const inbox = (data: AppNotification[], seenAt: string | null = null) => {
    const seen = vi.fn();
    let since = seenAt;
    server.use(
        http.get(`${API}/me/notifications`, () =>
            HttpResponse.json({
                data,
                unread: data.filter((n) => n.readAt === null).length,
                unseen: data.filter(
                    (n) =>
                        n.readAt === null &&
                        (since === null || n.createdAt > since)
                ).length,
                seenAt: since,
                awaitingAnswer: data.filter(awaitingAnswer).length,
                meta: { page: 1, limit: 30, total: data.length },
            })
        ),
        http.post(`${API}/me/notifications/seen`, () => {
            seen();
            since = "2099-01-01T00:00:00.000Z";
            return new HttpResponse(null, { status: 204 });
        })
    );
    return seen;
};

const panel = () =>
    renderWithProviders(
        <NotificationPanel onNavigate={() => {}} titleId="t" />
    );

const READ = "2026-01-02T00:00:00.000Z";

/** The test before closed its bell with something unread, and reads it a
 *  tick after; let that land before listening for this test's own. */
const lastTestsReads = () => new Promise((resolve) => setTimeout(resolve, 50));

describe("NotificationPanel", () => {
    it("offers to mark everything read while anything is unread", async () => {
        inbox([welcome(), welcome({ id: 2, readAt: READ })]);
        panel();
        expect(
            await screen.findByRole("button", { name: "Mark all read" })
        ).toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: "Clear all" })
        ).not.toBeInTheDocument();
    });

    /* Read first, then cleared: the same place empties the bell once there
       is nothing left to read. */
    it("offers to clear everything once it is all read", async () => {
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
            await screen.findByRole("button", { name: "Clear all" })
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
            await screen.findByRole("button", { name: "Clear all" })
        ).toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: "Mark all read" })
        ).toBeNull();
    });

    it("offers neither with nothing in the inbox", async () => {
        inbox([]);
        panel();
        expect(
            await screen.findByText("You’re up to date.")
        ).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Clear all" })).toBeNull();
        expect(
            screen.queryByRole("button", { name: "Mark all read" })
        ).toBeNull();
    });

    it("tells the server it was opened while something in it is new", async () => {
        const seen = inbox([welcome()]);
        panel();
        await waitFor(() => expect(seen).toHaveBeenCalled());
    });

    it("doesn't tell it again with nothing new", async () => {
        const seen = inbox(
            [welcome({ createdAt: "2026-01-01T00:00:00.000Z" })],
            "2026-02-01T00:00:00.000Z"
        );
        panel();
        await screen.findByText("Welcome to PlayRates");
        expect(seen).not.toHaveBeenCalled();
    });

    /* What was new when it opened stays under New while it's open, rather
       than moving once the bell has been marked seen. */
    it("heads what's waiting, then what's new, then the rest", async () => {
        const request = welcome({
            id: 3,
            kind: "friend_request",
            relation: "request-received",
            createdAt: "2026-01-03T00:00:00.000Z",
            actor: {
                id: "u2",
                username: "frostbyte",
                avatarUrl: null,
                accent: "indigo",
            },
        } as unknown as Partial<AppNotification>);
        inbox(
            [
                request,
                welcome({ id: 4, createdAt: "2026-01-05T00:00:00.000Z" }),
                welcome({ id: 5, readAt: READ }),
            ],
            "2026-01-04T00:00:00.000Z"
        );
        panel();
        const headings = await screen.findAllByRole("heading", { level: 3 });
        expect(headings.map((h) => h.textContent)).toEqual([
            "Needs you",
            "New",
            "Earlier",
        ]);
    });

    /* Not every row has somewhere to open, so closing the bell reads what
       it showed; while it's open they stay marked new. */
    it("reads what it showed once it closes, not while it's open", async () => {
        await lastTestsReads();
        const readAll = vi.fn();
        server.use(
            http.post(
                `${API}/me/notifications/read-all`,
                async ({ request }) => {
                    readAll(await request.json());
                    return new HttpResponse(null, { status: 204 });
                }
            )
        );
        inbox([welcome(), welcome({ id: 2 })]);
        const { unmount } = panel();
        await screen.findAllByText("Welcome to PlayRates");
        expect(readAll).not.toHaveBeenCalled();

        unmount();
        await waitFor(() =>
            expect(readAll).toHaveBeenCalledWith({ ids: [1, 2] })
        );
    });

    it("leaves one marked unread while it was open unread when it closes", async () => {
        await lastTestsReads();
        const readAll = vi.fn();
        server.use(
            http.post(
                `${API}/me/notifications/read-all`,
                async ({ request }) => {
                    readAll(await request.json());
                    return new HttpResponse(null, { status: 204 });
                }
            ),
            http.patch(`${API}/me/notifications/:id`, () =>
                HttpResponse.json(welcome())
            )
        );
        inbox([welcome({ readAt: READ }), welcome({ id: 2 })]);
        const { unmount } = panel();
        await userEvent.click(
            await screen.findByRole("button", { name: "Mark as unread" })
        );

        unmount();
        await waitFor(() => expect(readAll).toHaveBeenCalledWith({ ids: [2] }));
    });

    it("has nothing to read on closing when it's all read", async () => {
        await lastTestsReads();
        const readAll = vi.fn();
        server.use(
            http.post(`${API}/me/notifications/read-all`, () => {
                readAll();
                return new HttpResponse(null, { status: 204 });
            })
        );
        inbox([welcome({ readAt: READ })]);
        const { unmount } = panel();
        await screen.findByText("Welcome to PlayRates");
        unmount();
        await new Promise((resolve) => setTimeout(resolve, 20));
        expect(readAll).not.toHaveBeenCalled();
    });

    it("has no archive to switch to", async () => {
        inbox([welcome()]);
        panel();
        await screen.findByText("Welcome to PlayRates");
        expect(screen.queryByRole("radio", { name: "Archive" })).toBeNull();
    });
});
