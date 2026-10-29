import { describe, expect, it } from "vitest";
import { inboxFor, readAuthLinkResult } from "./authLinks";

describe("inboxFor", () => {
    it("offers the inbox an address's domain belongs to", () => {
        expect(inboxFor("callum@gmail.com")?.label).toBe("Open Gmail");
        expect(inboxFor("Someone@Hotmail.co.uk")?.label).toBe("Open Outlook");
    });

    it("offers nothing for a domain it doesn't know", () => {
        expect(inboxFor("hello@playrates.app")).toBeNull();
        expect(inboxFor("not an email")).toBeNull();
    });
});

describe("readAuthLinkResult", () => {
    it("says a confirmation link worked", () => {
        expect(readAuthLinkResult("?confirmed=1", "")).toBe("confirmed");
    });

    it("tells a link that ran out from one that failed otherwise", () => {
        expect(
            readAuthLinkResult(
                "",
                "#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid"
            )
        ).toBe("expired");
        expect(
            readAuthLinkResult("", "#error=server_error&error_code=unexpected")
        ).toBe("failed");
    });

    it("says nothing for an ordinary visit", () => {
        expect(readAuthLinkResult("?ref=marlowe", "#top")).toBeNull();
    });
});
