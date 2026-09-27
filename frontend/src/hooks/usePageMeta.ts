import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
    SITE_DESCRIPTION,
    SITE_ORIGIN,
    pageTitle,
    truncateDescription,
} from "@playrates/shared";

export interface PageMeta {
    /** The page's own name; the site's is added. Unset while it loads. */
    title?: string | null;
    description?: string | null;
    /** The canonical path, when it is not simply the one in the address bar:
     *  a filtered list points at the unfiltered one. */
    path?: string;
    /** Keep this page out of search results. */
    noindex?: boolean;
    /** An absolute URL for link previews. */
    image?: string | null;
}

export const DEFAULT_IMAGE = `${SITE_ORIGIN}/og-default.png`;

/** A tag in <head>, made if it is not there. The server may already have
 *  written it for this page, so it is found by what it is, not by who made
 *  it. */
const headTag = (
    tag: "meta" | "link",
    key: "name" | "property" | "rel",
    value: string
): HTMLElement => {
    const found = document.head.querySelector<HTMLElement>(
        `${tag}[${key}="${value}"]`
    );
    if (found) return found;
    const made = document.createElement(tag);
    made.setAttribute(key, value);
    document.head.append(made);
    return made;
};

const setMeta = (key: "name" | "property", value: string, content: string) =>
    headTag("meta", key, value).setAttribute("content", content);

/**
 * Names the tab and keeps the head's description, canonical, robots and
 * preview tags in step with the page, for as long as the caller is mounted.
 *
 * Crawlers that run the app read these; the ones that don't (Discord, iMessage
 * and the rest) get game, profile and thread pages from the server with the
 * same tags already in place.
 */
export const usePageMeta = ({
    title,
    description,
    path,
    noindex = false,
    image,
}: PageMeta) => {
    const { pathname } = useLocation();

    useEffect(() => {
        const fullTitle = pageTitle(title);
        const summary = description
            ? truncateDescription(description)
            : SITE_DESCRIPTION;
        const url = `${SITE_ORIGIN}${path ?? pathname}`;

        document.title = fullTitle;
        setMeta("name", "description", summary);
        setMeta("property", "og:title", fullTitle);
        setMeta("property", "og:description", summary);
        setMeta("property", "og:url", url);
        setMeta("property", "og:image", image ?? DEFAULT_IMAGE);
        headTag("link", "rel", "canonical").setAttribute("href", url);

        const robots = document.head.querySelector('meta[name="robots"]');
        if (noindex) setMeta("name", "robots", "noindex");
        else robots?.remove();

        /* A page that unmounts with nothing taking its place, the error
           boundary catching say, would otherwise leave its name behind. */
        return () => {
            document.title = pageTitle();
            document.head.querySelector('meta[name="robots"]')?.remove();
        };
    }, [title, description, path, pathname, noindex, image]);
};
