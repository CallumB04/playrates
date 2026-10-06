import { afterEach, describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SITE_DESCRIPTION } from "@playrates/shared";
import { usePageMeta, type PageMeta } from "./usePageMeta";

const Page = (meta: PageMeta) => {
    usePageMeta(meta);
    return null;
};

const at = (route: string, meta: PageMeta = {}) =>
    render(
        <MemoryRouter initialEntries={[route]}>
            <Page {...meta} />
        </MemoryRouter>
    );

const head = (selector: string, attr = "content") =>
    document.head.querySelector(selector)?.getAttribute(attr);

afterEach(() => {
    document.head.innerHTML = "";
});

describe("usePageMeta", () => {
    it("names the page and falls back to the site's description", () => {
        at("/library", { title: "Library" });

        expect(document.title).toBe("Library / PlayRates");
        expect(head('meta[name="description"]')).toBe(SITE_DESCRIPTION);
        expect(head('meta[property="og:title"]')).toBe("Library / PlayRates");
    });

    /* Filters live in the query string; every filtered view is the same
       page as far as a search engine should care. */
    it("points the canonical at the path, without the query", () => {
        at("/library?platform=xbox&page=3");

        expect(head('link[rel="canonical"]', "href")).toBe(
            "https://playrates.app/library"
        );
    });

    it("cuts a long description at a word", () => {
        at("/x", { description: "word ".repeat(60) });

        const description = head('meta[name="description"]')!;
        expect(description.length).toBeLessThanOrEqual(155);
        expect(description.endsWith("word…")).toBe(true);
    });

    it("asks to be left out of search when told to, and stops asking after", () => {
        const { unmount } = at("/settings", { noindex: true });
        expect(head('meta[name="robots"]')).toBe("noindex");

        unmount();
        expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
        expect(document.title).toBe("PlayRates / Video Game Tracker");
    });

    it("updates a tag the server already wrote rather than adding another", () => {
        document.head.innerHTML =
            '<meta name="description" content="from the server">';

        at("/x", { description: "from the app" });

        expect(
            document.head.querySelectorAll('meta[name="description"]')
        ).toHaveLength(1);
        expect(head('meta[name="description"]')).toBe("from the app");
    });
});
