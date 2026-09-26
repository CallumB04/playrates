import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { AppNotification } from "@playrates/shared";
import { server } from "../../test/msw/server";
import { renderWithProviders } from "../../test/renderWithProviders";
import NotificationItem from "./NotificationItem";

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

/** Captures the PATCH body, since that is what the row's controls are for. */
const capturePatch = () => {
    const seen = vi.fn();
    server.use(
        http.patch(`${API}/me/notifications/:id`, async ({ request }) => {
            seen(await request.json());
            return HttpResponse.json(welcome());
        })
    );
    return seen;
};

const renderItem = (notification: AppNotification) =>
    renderWithProviders(
        <ul>
            <NotificationItem
                notification={notification}
                onNavigate={() => {}}
            />
        </ul>
    );

describe("NotificationItem", () => {
    it("renders the copy registered against the kind", () => {
        renderItem(welcome());

        expect(screen.getByText("Welcome to PlayRates")).toBeInTheDocument();
    });

    /* A kind the server knows and this build does not must still draw a row
       rather than take the menu down with it. */
    it("falls back to a plain row for a kind it cannot render", () => {
        renderItem(welcome({ kind: "unknown" } as Partial<AppNotification>));

        expect(screen.getByText("Something happened")).toBeInTheDocument();
    });

    it("offers to read an unread notification, and to unread a read one", () => {
        const { unmount } = renderItem(welcome());
        expect(
            screen.getByRole("button", { name: "Mark as read" })
        ).toBeInTheDocument();
        unmount();

        renderItem(welcome({ readAt: "2026-01-02T00:00:00.000Z" }));
        expect(
            screen.getByRole("button", { name: "Mark as unread" })
        ).toBeInTheDocument();
    });

    it("marks an unread notification read", async () => {
        const seen = capturePatch();
        renderItem(welcome());

        await userEvent.click(
            screen.getByRole("button", { name: "Mark as read" })
        );

        await waitFor(() => expect(seen).toHaveBeenCalledWith({ read: true }));
    });

    it("archives from the inbox and restores from the archive", async () => {
        const seen = capturePatch();
        const { unmount } = renderItem(welcome());

        await userEvent.click(screen.getByRole("button", { name: "Archive" }));
        await waitFor(() =>
            expect(seen).toHaveBeenCalledWith({ archived: true })
        );
        unmount();

        renderItem(
            welcome({
                readAt: "2026-01-02T00:00:00.000Z",
                archivedAt: "2026-01-02T00:00:00.000Z",
            })
        );
        await userEvent.click(
            screen.getByRole("button", { name: "Move back to inbox" })
        );

        await waitFor(() =>
            expect(seen).toHaveBeenCalledWith({ archived: false })
        );
    });

    describe("upvote milestones", () => {
        it("links a message milestone to the message", () => {
            renderItem({
                ...welcome(),
                kind: "community_upvote_milestone",
                threadId: 4,
                threadTitle: "Best boss?",
                messageId: 9,
                excerpt: "The Radiance",
                milestone: 10,
            } as AppNotification);

            expect(
                screen.getByRole("link", { name: /10 upvotes on your message/ })
            ).toHaveAttribute("href", "/community/thread/4#message-9");
        });

        it("links a review milestone to the review on its game", async () => {
            const seen = capturePatch();
            renderItem({
                ...welcome(),
                kind: "review_upvote_milestone",
                reviewId: 3,
                gameId: 12,
                gameTitle: "Journey",
                coverUrl: null,
                milestone: 5,
            } as AppNotification);

            const link = screen.getByRole("link", {
                name: /5 upvotes on your review of Journey/,
            });
            expect(link).toHaveAttribute("href", "/game/12#review-3");
            await userEvent.click(link);
            await waitFor(() =>
                expect(seen).toHaveBeenCalledWith({ read: true })
            );
        });
    });

    describe("community notifications", () => {
        const actor = {
            id: "u2",
            username: "katleen",
            avatarUrl: null,
            accent: "indigo",
            bio: "",
            online: false,
        };

        it("opens a reply at the message, and reads it on the way", async () => {
            const seen = capturePatch();
            renderItem({
                ...welcome(),
                kind: "community_reply",
                actor,
                threadId: 4,
                threadTitle: "Best boss?",
                messageId: 9,
                excerpt: "The Radiance",
            } as AppNotification);

            const link = screen.getByRole("link", { name: /replied to you/ });
            expect(link).toHaveAttribute(
                "href",
                "/community/thread/4#message-9"
            );
            await userEvent.click(link);

            await waitFor(() =>
                expect(seen).toHaveBeenCalledWith({ read: true })
            );
        });

        it("stops counting a thread's new messages at 99+", () => {
            renderItem({
                ...welcome(),
                kind: "community_thread_activity",
                threadId: 4,
                threadTitle: "Best boss?",
                gameTitle: null,
                coverUrl: null,
                count: 150,
            } as AppNotification);

            expect(
                screen.getByRole("link", { name: /99\+ new messages/ })
            ).toBeInTheDocument();
        });

        it("counts a thread's new messages, and leaves a read one alone", async () => {
            const seen = capturePatch();
            renderItem({
                ...welcome(),
                readAt: "2026-01-02T00:00:00.000Z",
                kind: "community_thread_activity",
                threadId: 4,
                threadTitle: "Best boss?",
                gameTitle: "Hollow Knight",
                coverUrl: null,
                count: 3,
            } as AppNotification);

            const link = screen.getByRole("link", { name: /3 new messages/ });
            await userEvent.click(link);

            expect(link).toHaveAttribute("href", "/community/thread/4");
            expect(seen).not.toHaveBeenCalled();
        });
    });
});
