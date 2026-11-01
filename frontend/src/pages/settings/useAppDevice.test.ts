import { describe, expect, it } from "vitest";
import { isAppleMobile, pushStateFor } from "./useAppDevice";
import { keyBytes } from "../../lib/pushDevice";

const ready = {
    key: "key",
    supported: true,
    appleMobile: false,
    installed: false,
    permission: "default" as NotificationPermission,
};

describe("pushStateFor", () => {
    it("waits for the key, and offers nothing without one", () => {
        expect(pushStateFor({ ...ready, key: undefined })).toBe("checking");
        expect(pushStateFor({ ...ready, key: null })).toBe("unavailable");
    });

    it("sends an iPhone in Safari to install first", () => {
        expect(pushStateFor({ ...ready, appleMobile: true })).toBe(
            "install-first"
        );
        expect(
            pushStateFor({ ...ready, appleMobile: true, installed: true })
        ).toBe("ask");
    });

    it("says when the browser can't, or was told not to", () => {
        expect(pushStateFor({ ...ready, supported: false })).toBe(
            "unsupported"
        );
        expect(pushStateFor({ ...ready, permission: "denied" })).toBe(
            "blocked"
        );
    });
});

describe("isAppleMobile", () => {
    it("knows an iPad asking for the desktop site", () => {
        expect(
            isAppleMobile("Mozilla/5.0 (Macintosh; Intel Mac OS X)", 5)
        ).toBe(true);
        expect(
            isAppleMobile("Mozilla/5.0 (Macintosh; Intel Mac OS X)", 0)
        ).toBe(false);
        expect(
            isAppleMobile("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)", 5)
        ).toBe(true);
    });
});

describe("keyBytes", () => {
    it("reads URL-safe base64 without padding", () => {
        expect([...keyBytes("-_8")]).toEqual([251, 255]);
        expect([...keyBytes("AQID")]).toEqual([1, 2, 3]);
    });
});
