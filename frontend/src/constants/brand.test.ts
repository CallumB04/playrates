import { describe, expect, it } from "vitest";
import { SITE_DESCRIPTION } from "@playrates/shared";
import { BRAND_PITCH_TEXT } from "./brand";

describe("the pitch", () => {
    /* The server writes the description into pages before the app runs, from
       the shared copy. Two versions of one sentence would drift. */
    it("is the site's search description, word for word", () => {
        expect(SITE_DESCRIPTION).toBe(BRAND_PITCH_TEXT);
    });
});
