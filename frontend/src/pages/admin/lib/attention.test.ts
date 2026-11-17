import { describe, expect, it } from "vitest";
import type { AdminAttention, AdminHealth } from "@playrates/shared";
import {
    attentionBySection,
    attentionWords,
    needsYou,
    waitingElsewhere,
} from "./attention";

describe("attentionBySection", () => {
    it("adds the server's and the browsers' errors together under Health", () => {
        expect(
            attentionBySection({
                reports: 3,
                serverErrors: 2,
                clientErrors: 5,
                patchNotes: 1,
            })
        ).toEqual({ reports: 3, health: 7, announcements: 1 });
    });

    it("counts nothing while the counts load", () => {
        expect(attentionBySection(undefined)).toEqual({
            reports: 0,
            health: 0,
            announcements: 0,
        });
    });
});

describe("attentionWords", () => {
    it("says what each count is, one or many", () => {
        expect(attentionWords("reports", 1)).toBe("1 open report");
        expect(attentionWords("reports", 4)).toBe("4 open reports");
        expect(attentionWords("health", 1)).toBe("1 error in the last day");
        expect(attentionWords("health", 12)).toBe("12 errors in the last day");
        expect(attentionWords("announcements", 1)).toBe(
            "1 patch notes entry to send"
        );
        expect(attentionWords("announcements", 2)).toBe(
            "2 patch notes entries to send"
        );
    });
});

describe("waitingElsewhere", () => {
    const counts = { reports: 2, health: 3, announcements: 1 };

    it("leaves out the section on screen", () => {
        expect(waitingElsewhere(counts, "reports")).toBe(4);
        expect(waitingElsewhere(counts, "health")).toBe(3);
    });

    it("counts everything from a section with nothing of its own", () => {
        expect(waitingElsewhere(counts, "overview")).toBe(6);
        expect(waitingElsewhere(counts, undefined)).toBe(6);
    });
});

describe("needsYou", () => {
    const nothing: AdminAttention = {
        reports: 0,
        serverErrors: 0,
        clientErrors: 0,
        patchNotes: 0,
    };
    const health = (
        overrides: {
            database?: Partial<AdminHealth["database"]>;
            errors?: Partial<AdminHealth["errors"]>;
        } = {}
    ): AdminHealth => ({
        checkedAt: "2026-11-17T12:00:00Z",
        api: {
            ok: true,
            uptimeSeconds: 60,
            commit: null,
            region: null,
            node: "v22.0.0",
        },
        database: {
            ok: true,
            latencyMs: 40,
            error: null,
            ...overrides.database,
        },
        igdb: {
            configured: true,
            todayRequests: 3,
            todayFailures: 0,
            lastRequestAt: "2026-11-17T11:00:00Z",
            lastFailureAt: null,
            lastError: null,
        },
        errors: { last24h: 0, lastAt: null, ...overrides.errors },
    });

    it("is empty when nothing is waiting and everything answers", () => {
        expect(needsYou(nothing, health())).toEqual([]);
    });

    it("puts a system in trouble first, then errors, reports and patch notes", () => {
        const items = needsYou(
            { reports: 1, serverErrors: 2, clientErrors: 3, patchNotes: 4 },
            health({ database: { latencyMs: 2000 } })
        );
        expect(items.map((i) => i.key)).toEqual([
            "systems",
            "health",
            "reports",
            "announcements",
        ]);
        expect(items[0]).toMatchObject({
            text: "The database is slow to answer.",
            state: "slow",
        });
        expect(items[1]).toMatchObject({
            count: 5,
            text: "errors in the last day",
            detail: "2 from the API, 3 in browsers",
            to: "/admin/health",
        });
        expect(items[2]).toMatchObject({
            count: 1,
            text: "report to look at",
            to: "/admin/reports",
        });
        expect(items[3]).toMatchObject({
            count: 4,
            text: "patch notes entries to send",
            to: "/admin/announcements?view=patch-notes",
        });
    });

    it("leaves failed requests to the errors row rather than the systems'", () => {
        const items = needsYou(
            { ...nothing, serverErrors: 12 },
            health({ errors: { last24h: 12 } })
        );
        expect(items).toEqual([
            expect.objectContaining({
                key: "health",
                text: "errors in the last day",
                detail: "From the API",
            }),
        ]);
    });

    it("says where the errors came from when it was one place", () => {
        expect(
            needsYou({ ...nothing, clientErrors: 1 }, undefined)[0]
        ).toMatchObject({
            text: "error in the last day",
            detail: "In browsers",
        });
    });

    it("still says the database is down when the counts can't load", () => {
        expect(
            needsYou(undefined, health({ database: { ok: false } }))
        ).toEqual([
            expect.objectContaining({
                key: "systems",
                text: "The database isn’t answering.",
                state: "down",
            }),
        ]);
    });
});
