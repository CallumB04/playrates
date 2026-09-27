import { describe, expect, it } from "vitest";
import type { AdminActivityEvent } from "@playrates/shared";
import { activityMark, activitySummary } from "./activityPresentation";

const event = (overrides: Partial<AdminActivityEvent>): AdminActivityEvent => ({
    id: 1,
    kind: "signup",
    group: "account",
    createdAt: "2026-09-26T10:00:00Z",
    actor: { id: "u1", username: "bee", avatarUrl: null, accent: "indigo" },
    game: { id: 7, title: "Hades", coverUrl: null },
    subjectId: null,
    subjectUsername: null,
    excerpt: null,
    data: {},
    ...overrides,
});

describe("activitySummary", () => {
    it("says who joined", () => {
        expect(activitySummary(event({ game: null }))).toMatchObject({
            who: "bee",
            action: "joined PlayRates",
            target: null,
        });
    });

    it("does not name a closed account, even from an old line", () => {
        const summary = activitySummary(
            event({
                kind: "account_deleted",
                actor: null,
                data: { username: "gone" },
            })
        );
        expect(summary).toMatchObject({
            who: "Someone",
            action: "closed their account",
        });
    });

    it("falls back when the actor's account is gone", () => {
        expect(
            activitySummary(event({ kind: "log_added", actor: null })).who
        ).toBe("A deleted account");
    });

    it("uses the home feed's verb for a new log, and carries its rating", () => {
        const summary = activitySummary(
            event({
                kind: "log_added",
                group: "logs",
                data: { status: "played", playedStatus: "finished", rating: 8 },
            })
        );
        expect(summary).toMatchObject({
            action: "finished",
            target: "Hades",
            href: "/game/7",
            rating: 8,
        });
    });

    it("says a wishlisting the way the home feed does", () => {
        expect(
            activitySummary(
                event({
                    kind: "log_added",
                    group: "logs",
                    data: { status: "wishlist" },
                })
            ).action
        ).toBe("wishlisted");
    });

    it("describes a move between shelves after the game", () => {
        const summary = activitySummary(
            event({
                kind: "log_updated",
                group: "logs",
                data: {
                    from: {
                        status: "backlog",
                        playedStatus: null,
                        rating: null,
                    },
                    to: { status: "playing", playedStatus: null, rating: null },
                },
            })
        );
        expect(summary).toMatchObject({
            action: "moved",
            target: "Hades",
            after: "from Backlog to Playing",
            rating: null,
        });
    });

    it("describes a rating on its own as a rating", () => {
        const summary = activitySummary(
            event({
                kind: "log_updated",
                group: "logs",
                data: {
                    from: { status: "played", playedStatus: null, rating: 6 },
                    to: { status: "played", playedStatus: null, rating: 7.5 },
                },
            })
        );
        expect(summary).toMatchObject({ action: "rated", rating: 7.5 });
    });

    it("links a reply to its thread", () => {
        const summary = activitySummary(
            event({
                kind: "message_posted",
                group: "community",
                data: {
                    threadId: 12,
                    threadTitle: "Best boss?",
                    isReply: true,
                },
            })
        );
        expect(summary).toMatchObject({
            action: "answered someone in",
            target: "Best boss?",
            href: "/community/thread/12",
        });
    });

    it("tells a withdrawn request from an unfriending", () => {
        const base = {
            kind: "friend_removed",
            group: "social" as const,
            subjectUsername: "cee",
        };
        expect(
            activitySummary(event({ ...base, data: { wasAccepted: false } }))
                .action
        ).toBe("withdrew their request to");
        expect(
            activitySummary(event({ ...base, data: { wasAccepted: true } }))
        ).toMatchObject({
            action: "unfriended",
            target: "cee",
            href: "/user/cee",
        });
    });

    it("reports a name change with the old name", () => {
        const summary = activitySummary(
            event({
                kind: "profile_updated",
                data: { fields: ["username"], previousUsername: "old" },
            })
        );
        expect(summary).toMatchObject({
            action: "changed their name from",
            target: "old",
        });
    });

    it("still says something for a kind it has never seen", () => {
        expect(
            activitySummary(event({ kind: "brand_new_thing", group: null }))
                .action
        ).toBe("brand new thing");
    });
});

describe("activityMark", () => {
    it("marks a log with the shelf it landed on, in that shelf's hue", () => {
        const mark = activityMark(
            event({
                kind: "log_updated",
                group: "logs",
                data: {
                    from: { status: "backlog" },
                    to: { status: "wishlist" },
                },
            })
        );
        expect(mark).toMatchObject({
            label: "Wishlist",
            className: "text-status-wishlist",
        });
    });

    it("marks anything taken away as removed, whatever it was", () => {
        expect(
            activityMark(event({ kind: "review_removed", group: "reviews" }))
        ).toMatchObject({
            label: "Removed",
            className: "text-danger",
        });
    });

    it("says a review is private before anything else about it", () => {
        expect(
            activityMark(
                event({
                    kind: "review_posted",
                    group: "reviews",
                    data: { isPublic: false, containsSpoilers: true },
                })
            )?.label
        ).toBe("Private");
    });

    it("leaves everything else unmarked", () => {
        expect(
            activityMark(event({ kind: "friend_accepted", group: "social" }))
        ).toBeNull();
    });
});
