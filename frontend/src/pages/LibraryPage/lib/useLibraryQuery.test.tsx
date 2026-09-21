import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useLibraryQuery } from "./useLibraryQuery";

const wrapper = (initial = "/library") => {
    const Wrapper = ({ children }: { children: ReactNode }) => (
        <MemoryRouter initialEntries={[initial]}>{children}</MemoryRouter>
    );
    return Wrapper;
};

const renderQuery = (initial?: string) =>
    renderHook(() => ({ ...useLibraryQuery(), location: useLocation() }), {
        wrapper: wrapper(initial),
    });

describe("useLibraryQuery", () => {
    it("defaults to page one, most-logged, no filters", () => {
        const { result } = renderQuery();

        expect(result.current.query).toEqual({
            page: 1,
            search: "",
            platform: "",
            genre: "",
            excludeLogged: false,
            sort: "logged",
        });
    });

    it("reads every filter back out of the URL", () => {
        const { result } = renderQuery(
            "/library?page=3&q=lantern&platform=steam&genre=indie&hideLogged=1&sort=title"
        );

        expect(result.current.query).toEqual({
            page: 3,
            search: "lantern",
            platform: "steam",
            genre: "indie",
            excludeLogged: true,
            sort: "title",
        });
    });

    it("omits defaults, so a plain /library stays clean", () => {
        const { result } = renderQuery("/library?q=lantern");

        act(() => result.current.setQuery({ search: "" }));

        expect(result.current.location.search).toBe("");
    });

    it("resets to page one when a filter changes", () => {
        const { result } = renderQuery("/library?page=7");

        act(() => result.current.setQuery({ platform: "steam" }));

        expect(result.current.query.page).toBe(1);
        expect(result.current.query.platform).toBe("steam");
    });

    it("keeps the page when the pager is the one moving it", () => {
        const { result } = renderQuery("/library?q=lantern");

        act(() => result.current.setQuery({ page: 4 }));

        expect(result.current.query).toMatchObject({
            page: 4,
            search: "lantern",
        });
    });

    it("falls back to the default sort rather than trusting the URL", () => {
        const { result } = renderQuery("/library?sort=vibes");
        expect(result.current.query.sort).toBe("logged");
    });

    /* "popular" was RAWG's tracker count, offered as a sort of its own. It is
       the hidden tiebreaker under "logged" now, so an old link falls back
       rather than 422ing on the request. */
    it("falls back when an old RAWG sort is in the URL", () => {
        const { result } = renderQuery("/library?sort=popular");
        expect(result.current.query.sort).toBe("logged");
    });

    it("treats a nonsense page as page one", () => {
        expect(renderQuery("/library?page=0").result.current.query.page).toBe(
            1
        );
        expect(renderQuery("/library?page=-3").result.current.query.page).toBe(
            1
        );
        expect(renderQuery("/library?page=abc").result.current.query.page).toBe(
            1
        );
    });

    it("round-trips a full filter set through the URL", () => {
        const { result } = renderQuery();

        act(() =>
            result.current.setQuery({
                search: "lantern",
                platform: "steam",
                genre: "indie",
                excludeLogged: true,
                sort: "released",
            })
        );

        expect(result.current.query).toEqual({
            page: 1,
            search: "lantern",
            platform: "steam",
            genre: "indie",
            excludeLogged: true,
            sort: "released",
        });
    });
});
