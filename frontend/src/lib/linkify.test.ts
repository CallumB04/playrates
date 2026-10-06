import { describe, expect, it } from "vitest";
import { linkify } from "./linkify";

describe("linkify", () => {
    it("leaves text without links alone", () => {
        expect(linkify("Released v1.0 today, e.g. now.")).toEqual([
            "Released v1.0 today, e.g. now.",
        ]);
    });

    it("links a bare domain, keeping the sentence's full stop out", () => {
        expect(linkify("Now live at playrates.app.")).toEqual([
            "Now live at ",
            { href: "https://playrates.app", text: "playrates.app" },
            ".",
        ]);
    });

    it("links an email address as mailto, not as a domain", () => {
        expect(linkify("Email me at hello@playrates.app.")).toEqual([
            "Email me at ",
            { href: "mailto:hello@playrates.app", text: "hello@playrates.app" },
            ".",
        ]);
    });

    it("keeps a full URL as written, path included", () => {
        expect(
            linkify("See (https://github.com/CallumB04/playrates/issues).")
        ).toEqual([
            "See (",
            {
                href: "https://github.com/CallumB04/playrates/issues",
                text: "https://github.com/CallumB04/playrates/issues",
            },
            ").",
        ]);
    });

    it("never makes anything but http(s) or mailto links", () => {
        const hrefs = linkify("javascript:alert(1) data:text/html,x")
            .filter((p) => typeof p !== "string")
            .map((p) => (p as { href: string }).href);
        expect(hrefs).toEqual([]);
    });
});
