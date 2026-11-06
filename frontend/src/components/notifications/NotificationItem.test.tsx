import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { AppNotification } from "@playrates/shared";
import { server } from "../../test/msw/server";
import { renderWithProviders } from "../../test/renderWithProviders";
import { buildFriendEdge, buildProfile } from "../../test/msw/handlers";
import ToastStack from "../feedback/ToastStack";
import NotificationItem from "./NotificationItem";

// A friend request's Accept and Decline belong to someone signed in.
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

/** Captures the PATCH body, since that is what the row's controls are for. */
/** Which rows the last change to many was for. */
const seenIds = vi.fn();

const capturePatch = () => {
    const seen = vi.fn();
    server.use(
        http.patch(`${API}/me/notifications/:id`, async ({ request }) => {
            seen(await request.json());
            return HttpResponse.json(welcome());
        }),
        // Many at once: what changes, and which, apart.
        http.patch(`${API}/me/notifications`, async ({ request }) => {
            const { ids, ...patch } = (await request.json()) as {
                ids: number[];
            };
            seenIds(ids);
            seen(patch);
            return new HttpResponse(null, { status: 204 });
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

    it("colours its unread dot after its mark, not always purple", () => {
        const { container } = renderItem(
            welcome({
                kind: "list_upvote_milestone",
                listId: 1,
                listName: "Best of",
                milestone: 10,
            } as Partial<AppNotification>)
        );
        expect(container.querySelector(".bg-love")).toBeInTheDocument();
        expect(screen.getByText("Unread")).toHaveClass("sr-only");
    });

    /* A kind the server knows and this build does not must still draw a row
       rather than take the menu down with it. */
    it("falls back to a plain row for a kind it cannot render", () => {
        renderItem(welcome({ kind: "unknown" } as Partial<AppNotification>));

        expect(screen.getByText("New notification")).toBeInTheDocument();
    });

    /* The unread dot is the sign and the shortcut; the rest waits behind
       More, so a row carries one quiet control, not two. */
    /* No read button and no archive: the dot in the margin is the
       toggle, and Clear the one control at the end. */
    it("reads and unreads from the dot in its margin", async () => {
        const seen = capturePatch();
        const { unmount } = renderItem(welcome());
        expect(screen.getByRole("button", { name: "Clear" })).toBeEnabled();
        await userEvent.click(
            screen.getByRole("button", { name: "Mark as read" })
        );
        await waitFor(() => expect(seen).toHaveBeenCalledWith({ read: true }));
        unmount();

        renderItem(welcome({ readAt: "2026-01-02T00:00:00.000Z" }));
        expect(screen.queryByText("Unread")).not.toBeInTheDocument();
        await userEvent.click(
            screen.getByRole("button", { name: "Mark as unread" })
        );
        await waitFor(() => expect(seen).toHaveBeenCalledWith({ read: false }));
    });

    it("steps a read row's text back, and lifts an unread one's", () => {
        const row = (c: HTMLElement) => c.querySelector("li > div")!;
        const { container, unmount } = renderItem(welcome());
        expect(row(container)).toHaveClass("notification-unread");
        unmount();

        const read = renderItem(
            welcome({ readAt: "2026-01-02T00:00:00.000Z" })
        );
        expect(row(read.container)).toHaveClass("notification-read");
    });

    it("clears a row in one go, and Undo puts it back unread", async () => {
        const seen = capturePatch();
        renderWithProviders(
            <>
                <ul>
                    <NotificationItem
                        notification={welcome()}
                        onNavigate={() => {}}
                    />
                </ul>
                <ToastStack />
            </>
        );

        await userEvent.click(screen.getByRole("button", { name: "Clear" }));
        await waitFor(() =>
            expect(seen).toHaveBeenCalledWith({ archived: true })
        );
        // It says which one went, on a line of its own.
        const toasts = within(
            screen.getByRole("list", { name: "Notifications" })
        );
        expect(toasts.getByText("Cleared")).toBeInTheDocument();
        expect(toasts.getByText("Welcome to PlayRates")).toHaveClass(
            "truncate"
        );

        await userEvent.click(
            await screen.findByRole("button", { name: "Undo" })
        );
        await waitFor(() =>
            expect(seen).toHaveBeenCalledWith({ archived: false, read: false })
        );
    });

    /* A phone clears by swiping left; a scroll down the list, or a mouse,
       never does. */
    it("clears when swiped left by touch, and not when scrolled", async () => {
        const seen = capturePatch();
        const { container } = renderItem(welcome());
        const row = container.querySelector("li")!;
        const touch = { pointerType: "touch", pointerId: 1 };

        fireEvent.pointerDown(row, { ...touch, clientX: 300, clientY: 20 });
        fireEvent.pointerMove(row, { ...touch, clientX: 300, clientY: 80 });
        fireEvent.pointerUp(row, touch);
        fireEvent.pointerDown(row, {
            pointerType: "mouse",
            clientX: 300,
            clientY: 20,
        });
        fireEvent.pointerMove(row, {
            pointerType: "mouse",
            clientX: 100,
            clientY: 20,
        });
        fireEvent.pointerUp(row, { pointerType: "mouse" });
        expect(seen).not.toHaveBeenCalled();

        fireEvent.pointerDown(row, { ...touch, clientX: 300, clientY: 20 });
        fireEvent.pointerMove(row, { ...touch, clientX: 250, clientY: 22 });
        fireEvent.pointerMove(row, { ...touch, clientX: 150, clientY: 24 });
        fireEvent.pointerUp(row, touch);
        await waitFor(() =>
            expect(seen).toHaveBeenCalledWith({ archived: true })
        );
    });

    it("reads or unreads when swiped right by touch", async () => {
        const seen = capturePatch();
        const { container } = renderItem(welcome());
        const row = container.querySelector("li")!;
        const touch = { pointerType: "touch", pointerId: 1 };

        fireEvent.pointerDown(row, { ...touch, clientX: 100, clientY: 20 });
        fireEvent.pointerMove(row, { ...touch, clientX: 150, clientY: 22 });
        fireEvent.pointerMove(row, { ...touch, clientX: 250, clientY: 24 });
        fireEvent.pointerUp(row, touch);
        await waitFor(() => expect(seen).toHaveBeenCalledWith({ read: true }));
    });

    it("clears every row in a group at once", async () => {
        const seen = capturePatch();
        const accepted = (id: number, username: string) =>
            welcome({
                id,
                kind: "friend_accepted",
                actor: {
                    id: username,
                    username,
                    avatarUrl: null,
                    accent: "lime",
                },
            } as unknown as Partial<AppNotification>);
        const group = [accepted(1, "halcyon"), accepted(2, "marlowe")];
        renderWithProviders(
            <ul>
                <NotificationItem
                    notification={group[0]!}
                    group={group}
                    onNavigate={() => {}}
                />
            </ul>
        );

        expect(screen.getByText("halcyon and marlowe")).toBeInTheDocument();
        await userEvent.click(screen.getByRole("button", { name: "Clear" }));
        await waitFor(() =>
            expect(seen).toHaveBeenCalledWith({ archived: true })
        );
        expect(seenIds).toHaveBeenLastCalledWith([1, 2]);
    });

    it("says an invited friend got going, and what it paid", () => {
        renderItem({
            ...welcome(),
            kind: "referral_active",
            actor: null,
            username: "audit_ob2",
            xp: 250,
            tokens: 50,
        } as AppNotification);
        const link = screen.getByRole("link", {
            name: /audit_ob2 got going from your invite/,
        });
        expect(link).toHaveAttribute("href", "/user/audit_ob2");
        expect(link).toHaveTextContent("+250 XP");
        expect(link).toHaveTextContent("+50");
    });

    it("warns of a streak at risk, and leads to it", () => {
        renderItem({
            ...welcome(),
            kind: "streak_at_risk",
            weeks: 6,
            shield: false,
            endsAt: "2026-11-01T23:59:59Z",
        } as AppNotification);
        expect(
            screen.getByRole("link", { name: /Your 6 week streak/ })
        ).toHaveAttribute("href", "/progress#streak");
    });

    it("sends a nearly done task to where it's done", () => {
        renderItem({
            ...welcome(),
            kind: "task_nearly_done",
            period: "week",
            quest: "w_rate3",
            label: "Rate 3 games",
            count: 2,
            target: 3,
            xp: 40,
            tokens: 5,
            endsAt: "2026-11-01T23:59:59Z",
        } as AppNotification);
        const link = screen.getByRole("link", { name: /Rate 3 games/ });
        expect(link).toHaveAttribute("href", "/user/devuser/games?type=played");
        expect(link).toHaveTextContent("2 of 3");
    });

    it("takes a gift to where it's worn, with the sender's face", () => {
        renderItem({
            ...welcome(),
            kind: "gift_received",
            actor: { ...buildFriendEdge().user, username: "halcyon" },
            username: "halcyon",
            item: "colour_mint",
        } as AppNotification);

        expect(
            screen.getByRole("link", { name: /halcyon gifted you the Mint/ })
        ).toHaveAttribute("href", "/progress#name");
        expect(screen.getByText("H")).toBeInTheDocument();
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
                screen.getByRole("link", {
                    name: /10 reactions on your message/,
                })
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
                name: /5 reactions on your review of Journey/,
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

    describe("announcements", () => {
        const announcement = (overrides: Record<string, unknown> = {}) =>
            ({
                ...welcome(),
                kind: "announcement",
                tone: "warning",
                title: "Down for maintenance",
                body: "Back in an hour.",
                link: null,
                isTest: false,
                ...overrides,
            }) as AppNotification;

        it("wears its tone on its dot: a heads-up orange, an update purple", () => {
            const { container, unmount } = renderItem(announcement());
            expect(container.querySelector(".bg-warning")).toBeInTheDocument();
            unmount();

            const update = renderItem(announcement({ tone: "update" }));
            expect(
                update.container.querySelector(".bg-brand")
            ).toBeInTheDocument();
        });

        it("drops the dot once it's read", () => {
            const { container } = renderItem(
                announcement({ readAt: "2026-01-02T00:00:00.000Z" })
            );
            expect(container.querySelector(".bg-warning")).toBeNull();
        });

        it("shows the words it was sent with, and no link without one", () => {
            renderItem(announcement());

            expect(
                screen.getByText("Down for maintenance")
            ).toBeInTheDocument();
            expect(screen.getByText("Back in an hour.")).toBeInTheDocument();
            expect(screen.queryByRole("link")).not.toBeInTheDocument();
        });

        it("opens its link, and marks itself read on the way", async () => {
            const seen = capturePatch();
            renderItem(announcement({ link: "/community" }));

            const link = screen.getByRole("link", {
                name: /Down for maintenance/,
            });
            await userEvent.click(link);

            expect(link).toHaveAttribute("href", "/community");
            await waitFor(() =>
                expect(seen).toHaveBeenCalledWith({ read: true })
            );
        });

        it("opens a link in its message in a new tab, apart from its own link", () => {
            const { container } = renderItem(
                announcement({
                    link: "/community",
                    body: "Say hi on [Discord](https://discord.gg/abc).",
                })
            );

            const discord = screen.getByRole("link", { name: "Discord" });
            expect(discord).toHaveAttribute("href", "https://discord.gg/abc");
            expect(discord).toHaveAttribute("target", "_blank");
            expect(
                screen.getByRole("link", { name: /Down for maintenance/ })
            ).toHaveAttribute("href", "/community");
            expect(container.querySelector("a a")).toBeNull();
        });

        it("offers nothing to expand when all of it fits", () => {
            renderItem(announcement());
            expect(
                screen.queryByRole("button", { name: /Show more/ })
            ).not.toBeInTheDocument();
        });

        it("can be read in full when the bell cuts it off", async () => {
            // jsdom has no layout: say the clamp is hiding a line.
            vi.spyOn(
                HTMLElement.prototype,
                "scrollHeight",
                "get"
            ).mockReturnValue(80);
            vi.spyOn(
                HTMLElement.prototype,
                "clientHeight",
                "get"
            ).mockReturnValue(60);
            renderItem(announcement());

            const more = screen.getByRole("button", { name: /Show more/ });
            expect(screen.getByText("Back in an hour.")).toHaveClass(
                "line-clamp-3"
            );
            await userEvent.click(more);

            expect(
                screen.getByRole("button", { name: /Show less/ })
            ).toHaveAttribute("aria-expanded", "true");
            expect(screen.getByText("Back in an hour.")).not.toHaveClass(
                "line-clamp-3"
            );
            vi.restoreAllMocks();
        });

        it("says when it is only a test", () => {
            renderItem(announcement({ isTest: true }));
            expect(screen.getByText("Test")).toBeInTheDocument();
        });

        it("has nothing to act on as a preview", () => {
            renderWithProviders(
                <ul>
                    <NotificationItem
                        notification={announcement()}
                        onNavigate={() => {}}
                        preview
                    />
                </ul>
            );
            expect(
                screen.getByRole("button", { name: "Clear" })
            ).toBeDisabled();
        });
    });

    /* Its Accept and Decline are the way out of the inbox; until then it
       stays unread, with nothing else to press. */
    describe("a friend request", () => {
        const request = (relation: string | null) =>
            welcome({
                kind: "friend_request",
                actor: {
                    id: "u2",
                    username: "frostbyte",
                    avatarUrl: null,
                    accent: "indigo",
                },
                relation,
            } as unknown as Partial<AppNotification>);

        it("can't be cleared or read while it waits on an answer", () => {
            renderItem(request("request-received"));
            expect(
                screen.queryByRole("button", { name: "Clear" })
            ).not.toBeInTheDocument();
            expect(
                screen.queryByRole("button", { name: "Mark as read" })
            ).not.toBeInTheDocument();
            expect(screen.getByText("Unread")).toBeInTheDocument();
        });

        it("can be cleared once it has been answered", () => {
            renderItem(request("friend"));
            expect(
                screen.getByRole("button", { name: "Clear" })
            ).toBeInTheDocument();
        });
    });
});
