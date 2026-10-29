import { describe, expect, it } from "vitest";
import { emailedTo, sentNotice, testNotice } from "./broadcastCopy";

describe("broadcastCopy", () => {
    it("counts the members an email reaches", () => {
        expect(emailedTo({ newsSubscribers: 1 })).toBe("1 member");
        expect(emailedTo({ newsSubscribers: 1200 })).toBe("1,200 members");
    });

    it("says who it reaches before the count has loaded", () => {
        expect(emailedTo(undefined)).toBe("everyone with news emails on");
    });

    it("mentions the email only when there is one", () => {
        expect(testNotice(false)).toBe("In your bell, and nobody else’s");
        expect(testNotice(true)).toBe(
            "In your bell and your email, and nobody else’s"
        );
        expect(sentNotice(3, false)).toBe("In 3 inboxes");
        expect(sentNotice(3, true)).toBe(
            "In 3 inboxes, and on its way by email"
        );
    });
});
