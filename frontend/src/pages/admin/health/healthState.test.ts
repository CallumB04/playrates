import { describe, expect, it } from "vitest";
import type { AdminHealth } from "@playrates/shared";
import { headline, systemStates } from "./healthState";

const health = (
    overrides: {
        database?: Partial<AdminHealth["database"]>;
        igdb?: Partial<AdminHealth["igdb"]>;
        errors?: Partial<AdminHealth["errors"]>;
    } = {}
): AdminHealth => ({
    checkedAt: "2026-09-26T12:00:00Z",
    api: {
        ok: true,
        uptimeSeconds: 60,
        commit: null,
        region: null,
        node: "v22.0.0",
    },
    database: { ok: true, latencyMs: 40, error: null, ...overrides.database },
    igdb: {
        configured: true,
        todayRequests: 3,
        todayFailures: 0,
        lastRequestAt: "2026-09-26T11:00:00Z",
        lastFailureAt: null,
        lastError: null,
        ...overrides.igdb,
    },
    errors: { last24h: 0, lastAt: null, ...overrides.errors },
});

describe("headline", () => {
    it("says all is well when it is", () => {
        expect(headline(systemStates(health()))).toEqual({
            text: "Everything is answering.",
            state: "up",
        });
    });

    it("leads with the worst thing, and a dead database beats everything", () => {
        const states = systemStates(
            health({
                database: { ok: false, latencyMs: null, error: "timeout" },
                errors: { last24h: 40 },
            })
        );
        expect(headline(states)).toEqual({
            text: "The database isn’t answering.",
            state: "down",
        });
    });

    it("calls IGDB failing only while its last call was the failure", () => {
        const failing = health({
            igdb: { lastFailureAt: "2026-09-26T11:00:00Z" },
        });
        expect(systemStates(failing).igdb).toBe("slow");

        const recovered = health({
            igdb: {
                lastFailureAt: "2026-09-26T09:00:00Z",
                lastRequestAt: "2026-09-26T11:00:00Z",
            },
        });
        expect(systemStates(recovered).igdb).toBe("up");
    });

    it("says how many requests failed, rather than a few", () => {
        const h = health({ errors: { last24h: 1 } });
        expect(headline(systemStates(h), 1).text).toBe(
            "Answering, but 1 request failed in the last day."
        );
    });

    it("counts a slow database as struggling, not down", () => {
        expect(
            systemStates(health({ database: { latencyMs: 1500 } })).database
        ).toBe("slow");
    });
});
