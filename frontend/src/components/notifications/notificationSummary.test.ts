import { describe, expect, it } from "vitest";
import type { AppNotification } from "@playrates/shared";
import { summaryOf } from "./notificationSummary";

const actor = (username: string) => ({
    id: username,
    username,
    avatarUrl: null,
    accent: "lime",
});

const base = {
    createdAt: "2026-11-05T10:00:00Z",
    readAt: null,
    archivedAt: null,
};

describe("summaryOf", () => {
    it("says a row's first line as the bell does", () => {
        expect(
            summaryOf([
                {
                    ...base,
                    id: 1,
                    kind: "list_upvote_milestone",
                    listId: 7,
                    listName: "Best of",
                    username: "ana",
                    milestone: 5,
                } as AppNotification,
            ])
        ).toBe("5 loves on your list Best of");
        expect(
            summaryOf([
                {
                    ...base,
                    id: 2,
                    kind: "announcement",
                    tone: "warning",
                    title: "Down for a moment",
                    body: "",
                    link: null,
                    isTest: false,
                } as AppNotification,
            ])
        ).toBe("Down for a moment");
    });

    it("says why a reply reached you", () => {
        const reply = (reason?: "reply" | "thread" | "conversation") =>
            ({
                ...base,
                id: 1,
                kind: "community_reply",
                reason,
                actor: actor("halcyon"),
                threadId: 4,
                threadTitle: "Best route?",
                messageId: 1,
                excerpt: "",
            }) as AppNotification;
        expect(summaryOf([reply()])).toBe(
            "halcyon replied to you in Best route?"
        );
        expect(summaryOf([reply("thread")])).toBe(
            "halcyon replied in your thread Best route?"
        );
        expect(summaryOf([reply("conversation")])).toBe(
            "halcyon also replied in Best route?"
        );
    });

    it("doesn't name a hidden thread twice when it's yours", () => {
        const reply = (reason: "reply" | "thread") =>
            ({
                ...base,
                id: 1,
                kind: "community_reply",
                reason,
                actor: actor("halcyon"),
                threadId: 4,
                threadTitle: "a thread about an adult game",
                messageId: 1,
                excerpt: "",
                hidden: true,
            }) as AppNotification;
        expect(summaryOf([reply("thread")])).toBe(
            "halcyon replied in your thread"
        );
        expect(summaryOf([reply("reply")])).toBe(
            "halcyon replied to you in a thread about an adult game"
        );
    });

    it("names a group as its row does, each person once", () => {
        const reply = (id: number, username: string) =>
            ({
                ...base,
                id,
                kind: "community_reply",
                actor: actor(username),
                threadId: 4,
                threadTitle: "Best route?",
                messageId: id,
                excerpt: "",
            }) as AppNotification;
        expect(
            summaryOf([
                reply(1, "halcyon"),
                reply(2, "marlowe"),
                reply(3, "halcyon"),
            ])
        ).toBe("halcyon and marlowe replied to you in Best route?");
        expect(
            summaryOf([
                { ...base, id: 5, kind: "friend_accepted", actor: actor("a") },
                { ...base, id: 6, kind: "friend_accepted", actor: actor("b") },
                { ...base, id: 7, kind: "friend_accepted", actor: actor("c") },
            ] as AppNotification[])
        ).toBe("a, b and 1 other accepted your friend requests");
    });
});
