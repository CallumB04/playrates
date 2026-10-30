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

describe("activitySummary, for what v1.1 added", () => {
    const says = (overrides: Partial<AdminActivityEvent>) => {
        const s = activitySummary(event(overrides));
        return [s.who, s.action, s.target, s.after].filter(Boolean).join(" ");
    };

    it("names the reaction, and keeps an upvote an upvote", () => {
        expect(
            says({ kind: "review_upvoted", data: { reaction: "fire" } })
        ).toBe("bee reacted Fire to a review of Hades");
        expect(
            says({ kind: "review_upvoted", data: { reaction: "upvote" } })
        ).toBe("bee upvoted a review of Hades");
        expect(
            says({
                kind: "message_upvoted",
                game: null,
                data: { reaction: "goat", threadTitle: "Best RPG" },
            })
        ).toBe("bee reacted GOAT to a message in Best RPG");
    });

    it("tells lists and what goes on them", () => {
        expect(
            says({
                kind: "list_created",
                game: null,
                subjectId: "4",
                data: { name: "Cosy" },
            })
        ).toBe("bee made the list Cosy");
        expect(
            activitySummary(
                event({
                    kind: "list_created",
                    subjectId: "4",
                    data: { name: "Cosy" },
                })
            ).href
        ).toBe("/user/bee/lists/4");
        expect(
            says({
                kind: "list_updated",
                game: null,
                data: { name: "Cosy", fields: ["name", "visibility"] },
            })
        ).toBe("bee changed the name and visibility of Cosy");
        expect(says({ kind: "list_game_added", data: { name: "Cosy" } })).toBe(
            "bee added Hades to Cosy"
        );
        expect(
            says({ kind: "list_game_removed", data: { name: "Cosy" } })
        ).toBe("bee took Hades off Cosy");
    });

    it("tells Gaming 25 picks by their category", () => {
        expect(
            says({ kind: "g25_picked", data: { category: "hardest_game" } })
        ).toBe("bee picked Hades as their hardest game");
        expect(
            says({ kind: "g25_loved", game: null, subjectUsername: "ana" })
        ).toBe("bee loved ana’s Gaming 25");
    });

    it("tells progress in its own terms", () => {
        expect(says({ kind: "level_up", game: null, data: { level: 7 } })).toBe(
            "bee reached level 7"
        );
        expect(
            says({
                kind: "badge_earned",
                game: null,
                data: { badge: "critic", metal: 2 },
            })
        ).toMatch(/^bee earned .+ in silver$/);
        expect(
            says({
                kind: "task_done",
                game: null,
                data: { quest: "w_rate3", xp: 40 },
            })
        ).toBe("bee did the task Rate 3 games for 40 XP");
    });

    it("tells what was bought and given, and for how much", () => {
        expect(
            says({
                kind: "item_bought",
                game: null,
                data: { item: "frame_neon", tokens: 120 },
            })
        ).toBe("bee bought the Neon frame for 120 tokens");
        expect(says({ kind: "background_bought", data: { tokens: 0 } })).toBe(
            "bee took their free background from Hades"
        );
        expect(
            says({
                kind: "gift_sent",
                game: null,
                subjectUsername: "ana",
                data: { item: "frame_neon", tokens: 120 },
            })
        ).toBe("bee gave ana the Neon frame, for 120 tokens");
    });

    it("says which emails were turned off or back on", () => {
        expect(
            says({
                kind: "email_prefs_changed",
                game: null,
                data: { off: ["news"], on: [] },
            })
        ).toBe("bee turned off news and patch notes emails");
        expect(
            says({
                kind: "email_prefs_changed",
                game: null,
                data: { off: [], on: ["all"] },
            })
        ).toBe("bee turned all their emails back on");
    });

    it("marks what went as a removal", () => {
        for (const kind of [
            "list_deleted",
            "list_game_removed",
            "g25_unpicked",
        ]) {
            expect(activityMark(event({ kind }))?.label).toBe("Removed");
        }
    });
});
