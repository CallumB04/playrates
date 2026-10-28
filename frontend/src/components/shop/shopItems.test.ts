import { describe, expect, it } from "vitest";
import { giftPath, itemName } from "./shopItems";

describe("giftPath", () => {
    it("takes a look or a reaction to its heading on the progress page", () => {
        expect(giftPath("frame_neon", "me")).toBe("/progress#frame");
        expect(giftPath("theme_retro", "me")).toBe("/progress#theme");
        expect(giftPath("font_pixel", "me")).toBe("/progress#name");
        expect(giftPath("colour_mint", "me")).toBe("/progress#name");
        expect(giftPath("react_hype", "me")).toBe("/progress#reaction");
        expect(giftPath("streak_shield", "me")).toBe("/progress#streak");
    });

    it("opens the picker a slot adds to", () => {
        expect(giftPath("slot_pinned_review", "me")).toBe(
            "/user/me?edit=pinned_reviews"
        );
        expect(giftPath("slot_showcase", "me")).toBe(
            "/user/me/badges?edit=showcase"
        );
        expect(giftPath("slot_pinned_list", "me")).toBe(
            "/progress#pinned-lists"
        );
    });

    it("falls back to the shop for an item it doesn't know", () => {
        expect(giftPath("retired", "me")).toBe("/shop");
    });
});

describe("itemName", () => {
    it("says what an item is, in a sentence", () => {
        expect(itemName("frame_neon")).toBe("the Neon frame");
        expect(itemName("slot_showcase")).toBe("an extra showcase slot");
        expect(itemName("retired")).toBe("something from the shop");
    });
});
