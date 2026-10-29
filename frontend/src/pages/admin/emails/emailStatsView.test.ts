import { describe, expect, it } from "vitest";
import type { EmailStats } from "@playrates/shared";
import {
    accountEmails,
    dailyUsed,
    kindLabel,
    limitTone,
    monthSent,
} from "./emailStatsView";

const stats = (overrides: Partial<EmailStats> = {}): EmailStats => ({
    last24h: { sent: 10, capped: 0, failed: 0 },
    resend: { sent: 14, more: false, bounced: 0, complained: 0 },
    days: [
        { day: "2026-11-09", sent: 3, capped: 1, failed: 0 },
        { day: "2026-11-10", sent: 10, capped: 0, failed: 2 },
    ],
    kinds: [],
    broadcasts: { count: 0, recipients: 0 },
    newsSubscribers: 0,
    ...overrides,
});

describe("email stats, for the admin", () => {
    it("warns at 80% of a limit and alarms at 95%", () => {
        expect(limitTone(79, 100)).toBe("ok");
        expect(limitTone(80, 100)).toBe("warning");
        expect(limitTone(95, 100)).toBe("danger");
    });

    it("works out the account emails from Resend's count", () => {
        expect(accountEmails(stats())).toBe(4);
        expect(
            accountEmails(
                stats({
                    resend: { sent: 8, more: false, bounced: 0, complained: 0 },
                })
            )
        ).toBe(0);
        expect(accountEmails(stats({ resend: null }))).toBeNull();
    });

    it("measures the day by Resend, or by the log without it", () => {
        expect(dailyUsed(stats())).toBe(14);
        expect(dailyUsed(stats({ resend: null }))).toBe(10);
    });

    it("adds up the month, sent only", () => {
        expect(monthSent(stats())).toBe(13);
    });

    it("names the kinds, and shows an unknown one as it is", () => {
        expect(kindLabel("friend_request")).toBe("Friend requests");
        expect(kindLabel("something_new")).toBe("something_new");
    });
});
