import { describe, expect, it } from "vitest";
import type { AdminHealth } from "@playrates/shared";
import { headline, systemStates } from "./healthState";

const health = (overrides: { database?: Partial<AdminHealth["database"]>; rawg?: Partial<AdminHealth["rawg"]>; errors?: Partial<AdminHealth["errors"]> } = {}): AdminHealth => ({
    checkedAt: "2026-09-26T12:00:00Z",
    api: { ok: true, uptimeSeconds: 60, commit: null, region: null, node: "v22.0.0" },
    database: { ok: true, latencyMs: 40, error: null, ...overrides.database },
    rawg: {
        configured: true,
        todayRequests: 3,
        todayFailures: 0,
        lastRequestAt: "2026-09-26T11:00:00Z",
        lastFailureAt: null,
        lastError: null,
        ...overrides.rawg,
    },
    errors: { last24h: 0, lastAt: null, ...overrides.errors },
});

describe("headline", () => {
    it("says all is well when it is", () => {
        expect(headline(systemStates(health()))).toEqual({ text: "Everything is answering.", state: "up" });
    });

    it("leads with the worst thing, and a dead database beats everything", () => {
        const states = systemStates(
            health({ database: { ok: false, latencyMs: null, error: "timeout" }, errors: { last24h: 40 } })
        );
        expect(headline(states)).toEqual({ text: "The database isn’t answering.", state: "down" });
    });

    it("calls RAWG failing only while its last call was the failure", () => {
        const failing = health({ rawg: { lastFailureAt: "2026-09-26T11:00:00Z" } });
        expect(systemStates(failing).rawg).toBe("slow");

        const recovered = health({
            rawg: { lastFailureAt: "2026-09-26T09:00:00Z", lastRequestAt: "2026-09-26T11:00:00Z" },
        });
        expect(systemStates(recovered).rawg).toBe("up");
    });

    it("counts a slow database as struggling, not down", () => {
        expect(systemStates(health({ database: { latencyMs: 1500 } })).database).toBe("slow");
    });
});
