import { describe, expect, it } from "vitest";
import { AnnouncementInputSchema } from "@playrates/shared";
import { composeAnnouncement } from "./composeAnnouncement";

const fields = {
    tone: "info" as const,
    title: " Hi ",
    body: " There ",
    link: "",
};

describe("composeAnnouncement", () => {
    it("trims, and sends no link rather than an empty one", () => {
        expect(composeAnnouncement(fields)).toEqual({
            tone: "info",
            title: "Hi",
            body: "There",
            link: null,
        });
    });

    it("passes an in-app path and fails another site, per the shared schema", () => {
        expect(
            AnnouncementInputSchema.safeParse(
                composeAnnouncement({ ...fields, link: "/community" })
            ).success
        ).toBe(true);
        expect(
            AnnouncementInputSchema.safeParse(
                composeAnnouncement({ ...fields, link: "https://example.com" })
            ).success
        ).toBe(false);
    });
});
