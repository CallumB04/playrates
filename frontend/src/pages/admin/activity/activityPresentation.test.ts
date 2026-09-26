import { describe, expect, it } from "vitest";
import type { AdminActivityEvent } from "@playrates/shared";
import { activitySummary, activityTone } from "./activityPresentation";

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

    it("names a deleted account by the username it had", () => {
        const summary = activitySummary(
            event({ kind: "account_deleted", actor: null, data: { username: "gone" } })
        );
        expect(summary.who).toBe("gone");
    });

    it("falls back when the actor's account is gone", () => {
        expect(activitySummary(event({ kind: "log_added", actor: null })).who).toBe(
            "A deleted account"
        );
    });

    it("puts a new log on its shelf, played status and all, with the rating", () => {
        const summary = activitySummary(
            event({
                kind: "log_added",
                group: "logs",
                data: { status: "played", playedStatus: "finished", rating: 8 },
            })
        );
        expect(summary).toMatchObject({
            action: "added to Finished",
            target: "Hades",
            href: "/game/7",
            tags: ["8.00/10"],
        });
    });

    it("describes a move between shelves", () => {
        const summary = activitySummary(
            event({
                kind: "log_updated",
                group: "logs",
                data: {
                    from: { status: "backlog", playedStatus: null, rating: null },
                    to: { status: "playing", playedStatus: null, rating: null },
                },
            })
        );
        expect(summary.action).toBe("moved from Backlog to Playing");
        expect(summary.tags).toEqual([]);
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
        expect(summary).toMatchObject({ action: "rated", tags: ["7.50/10"] });
    });

    it("tags a private review with spoilers", () => {
        const summary = activitySummary(
            event({
                kind: "review_posted",
                group: "reviews",
                data: { isPublic: false, containsSpoilers: true },
            })
        );
        expect(summary.tags).toEqual(["private", "spoilers"]);
    });

    it("links a reply to its thread", () => {
        const summary = activitySummary(
            event({
                kind: "message_posted",
                group: "community",
                data: { threadId: 12, threadTitle: "Best boss?", isReply: true },
            })
        );
        expect(summary).toMatchObject({
            action: "replied to someone in",
            target: "Best boss?",
            href: "/community/thread/12",
        });
    });

    it("tells a withdrawn request from an unfriending", () => {
        const base = { kind: "friend_removed", group: "social" as const, subjectUsername: "cee" };
        expect(activitySummary(event({ ...base, data: { wasAccepted: false } })).action).toBe(
            "withdrew a friend request to"
        );
        expect(activitySummary(event({ ...base, data: { wasAccepted: true } }))).toMatchObject({
            action: "unfriended",
            target: "cee",
            href: "/user/cee",
        });
    });

    it("reports a username change with the old name", () => {
        const summary = activitySummary(
            event({
                kind: "profile_updated",
                data: { fields: ["username"], previousUsername: "old" },
            })
        );
        expect(summary.action).toBe("changed their username from old");
    });

    it("still says something for a kind it has never seen", () => {
        expect(activitySummary(event({ kind: "brand_new_thing", group: null })).action).toBe(
            "brand new thing"
        );
    });
});

describe("activityTone", () => {
    it("wears the colour of the shelf a log landed on", () => {
        const tone = activityTone(
            event({
                kind: "log_updated",
                group: "logs",
                data: { from: { status: "backlog" }, to: { status: "wishlist" } },
            })
        );
        expect(tone.bar).toBe("bg-status-wishlist");
    });

    it("makes anything taken away read as a removal, whatever it was", () => {
        expect(activityTone(event({ kind: "review_removed", group: "reviews" })).bar).toBe(
            "bg-danger"
        );
    });

    it("colours the rest by group", () => {
        expect(activityTone(event({ kind: "review_posted", group: "reviews" })).bar).toBe(
            "bg-info"
        );
    });
});
