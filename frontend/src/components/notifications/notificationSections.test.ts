import { describe, expect, it } from "vitest";
import type { AppNotification } from "@playrates/shared";
import { feedSections, namesOf } from "./notificationSections";

const NOW = new Date("2026-11-05T12:00:00Z");

const note = (
    id: number,
    createdAt: string,
    overrides: Record<string, unknown> = {}
) =>
    ({
        id,
        kind: "welcome",
        createdAt,
        readAt: null,
        archivedAt: null,
        ...overrides,
    }) as AppNotification;

const accepted = (id: number, createdAt: string, username: string) =>
    note(id, createdAt, {
        kind: "friend_accepted",
        actor: { id: username, username, avatarUrl: null, accent: "lime" },
    });

describe("feedSections", () => {
    it("puts what waits on an answer first, then what's new since last time", () => {
        const sections = feedSections(
            [
                note(1, "2026-11-05T10:00:00Z"),
                note(2, "2026-11-01T10:00:00Z", {
                    kind: "friend_request",
                    relation: "request-received",
                }),
                note(3, "2026-11-03T10:00:00Z", {
                    readAt: "2026-11-03T11:00:00Z",
                }),
                note(4, "2026-10-01T10:00:00Z", {
                    readAt: "2026-10-01T11:00:00Z",
                }),
            ],
            "2026-11-04T00:00:00Z",
            NOW
        );

        expect(
            sections.map((s) => [s.id, s.entries.map((e) => e.items[0]!.id)])
        ).toEqual([
            ["needs", [2]],
            ["new", [1]],
            ["week", [3]],
            ["earlier", [4]],
        ]);
    });

    it("counts an unread one from before the bell was opened as old, not new", () => {
        const [section] = feedSections(
            [note(1, "2026-11-03T10:00:00Z")],
            "2026-11-04T00:00:00Z",
            NOW
        );
        expect(section!.id).toBe("week");
    });

    it("calls everything unread new when the bell has never been opened", () => {
        const [section] = feedSections(
            [note(1, "2026-10-01T10:00:00Z")],
            null,
            NOW
        );
        expect(section!.id).toBe("new");
    });

    it("folds friends accepting on one day into one row, and keeps days apart", () => {
        const [section] = feedSections(
            [
                accepted(1, "2026-11-05T10:00:00Z", "halcyon"),
                accepted(2, "2026-11-05T09:00:00Z", "marlowe"),
                accepted(3, "2026-11-04T09:00:00Z", "nightjar"),
            ],
            null,
            NOW
        );
        expect(section!.entries.map((e) => e.items.map((n) => n.id))).toEqual([
            [1, 2],
            [3],
        ]);
    });

    it("folds replies in the same thread, not across threads", () => {
        const reply = (id: number, threadId: number) =>
            note(id, "2026-11-05T10:00:00Z", {
                kind: "community_reply",
                threadId,
            });
        const [section] = feedSections(
            [reply(1, 7), reply(2, 7), reply(3, 8)],
            null,
            NOW
        );
        expect(section!.entries.map((e) => e.items.length)).toEqual([2, 1]);
    });

    it("leaves out a section with nothing in it", () => {
        expect(feedSections([], null, NOW)).toEqual([]);
    });
});

describe("namesOf", () => {
    it("names one or two, and counts the rest", () => {
        expect(namesOf(["halcyon"])).toBe("halcyon");
        expect(namesOf(["halcyon", "marlowe"])).toBe("halcyon and marlowe");
        expect(namesOf(["halcyon", "marlowe", "kestrel"])).toBe(
            "halcyon, marlowe and 1 other"
        );
        expect(namesOf(["a", "b", "c", "d"])).toBe("a, b and 2 others");
    });
});
