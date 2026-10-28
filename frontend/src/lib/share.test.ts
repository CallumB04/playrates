import { describe, expect, it } from "vitest";
import { shareLinks } from "./share";

const URL_ = "https://playrates.app/user/tester/gaming-25";
const TEXT = "My Gaming 25 & yours?";

const linkFor = (target: string) =>
    new URL(shareLinks(URL_, TEXT).find((l) => l.target === target)!.href);

describe("shareLinks", () => {
    it("gives X the text and the link apart, encoded", () => {
        const x = linkFor("x");
        expect(x.origin + x.pathname).toBe("https://x.com/intent/post");
        expect(x.searchParams.get("text")).toBe(TEXT);
        expect(x.searchParams.get("url")).toBe(URL_);
    });

    it("puts the link in the text for those that take only text", () => {
        for (const target of ["bluesky", "threads", "whatsapp"]) {
            expect(linkFor(target).searchParams.get("text")).toBe(
                `${TEXT} ${URL_}`
            );
        }
    });

    it("gives Reddit a title and Facebook only the link", () => {
        expect(linkFor("reddit").searchParams.get("title")).toBe(TEXT);
        expect(linkFor("reddit").searchParams.get("url")).toBe(URL_);
        expect([...linkFor("facebook").searchParams.keys()]).toEqual(["u"]);
    });
});
