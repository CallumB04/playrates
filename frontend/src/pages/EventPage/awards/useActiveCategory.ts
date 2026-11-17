import { useEffect, useState } from "react";

/**
 * Which of these sections is being read: the one nearest the top of the
 * window, past the header. For the awards' navigation to light up as the
 * page scrolls. Nothing without IntersectionObserver, where the first holds.
 */
export const useActiveCategory = (ids: string[]): string | null => {
    const [active, setActive] = useState<string | null>(ids[0] ?? null);
    const key = ids.join(" ");

    useEffect(() => {
        const sections = key
            .split(" ")
            .flatMap((id) => document.getElementById(id) ?? []);
        if (typeof IntersectionObserver === "undefined" || !sections.length) {
            return;
        }
        const observer = new IntersectionObserver(
            (entries) => {
                const [nearest] = entries
                    .filter((entry) => entry.isIntersecting)
                    .sort(
                        (a, b) =>
                            a.boundingClientRect.top - b.boundingClientRect.top
                    );
                if (nearest) setActive(nearest.target.id);
            },
            // A band across the upper part of the window, below the header.
            { rootMargin: "-20% 0px -70% 0px" }
        );
        sections.forEach((section) => observer.observe(section));
        return () => observer.disconnect();
    }, [key]);

    return active;
};

/** Brings a category into view, under the sticky header and bar. By the
 *  window's own scroll, which html's overflow-x leaves working where
 *  scrollIntoView stood still. */
export const goToCategory = (id: string) => {
    const section = document.getElementById(id);
    if (!section) return;
    const margin = parseFloat(getComputedStyle(section).scrollMarginTop) || 0;
    const reduce = window.matchMedia?.(
        "(prefers-reduced-motion: reduce)"
    ).matches;
    window.scrollTo({
        top: section.getBoundingClientRect().top + window.scrollY - margin,
        behavior: reduce ? "auto" : "smooth",
    });
};
