import { describe, expect, it } from "vitest";
import type { AnnouncementNotification } from "@playrates/shared";
import {
    ANNOUNCEMENT_PRESENTATION,
    announcementLook,
} from "./announcementTones";

const announcement = (
    extra: Partial<AnnouncementNotification> = {}
): AnnouncementNotification => ({
    id: 1,
    kind: "announcement",
    createdAt: "2026-11-18T12:00:00Z",
    readAt: null,
    archivedAt: null,
    tone: "update",
    title: "The Game Awards 2026: the nominees are in",
    body: "Make your picks.",
    link: "/events/the-game-awards-2026",
    isTest: false,
    ...extra,
});

describe("announcementLook", () => {
    it("draws an event announcement with the event look, whatever tone came with it", () => {
        expect(announcementLook(announcement({ event: true }))).toBe(
            ANNOUNCEMENT_PRESENTATION.event
        );
    });

    it("draws any other by its tone", () => {
        expect(announcementLook(announcement({ tone: "warning" }))).toBe(
            ANNOUNCEMENT_PRESENTATION.warning
        );
    });
});
