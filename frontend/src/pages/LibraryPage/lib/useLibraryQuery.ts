import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { GAME_SORTS, type GameSort } from "@playrates/shared";

export interface LibraryQuery {
    page: number;
    search: string;
    platform: string;
    genre: string;
    excludeLogged: boolean;
    sort: GameSort;
}

const DEFAULTS: LibraryQuery = {
    page: 1,
    search: "",
    platform: "",
    genre: "",
    excludeLogged: false,
    sort: "popular",
};

const isSort = (value: string): value is GameSort =>
    (GAME_SORTS as readonly string[]).includes(value);

/**
 * The library's state lives in the URL, so a filtered page is linkable and the
 * back button walks the filters rather than leaving the page.
 *
 * Values equal to their default are omitted, which keeps a plain /library
 * clean instead of trailing seven redundant params.
 */
export const useLibraryQuery = () => {
    const [params, setParams] = useSearchParams();

    const query = useMemo<LibraryQuery>(() => {
        const sort = params.get("sort") ?? "";
        return {
            page: Math.max(1, Number(params.get("page")) || 1),
            search: params.get("q") ?? DEFAULTS.search,
            platform: params.get("platform") ?? DEFAULTS.platform,
            genre: params.get("genre") ?? DEFAULTS.genre,
            excludeLogged: params.get("hideLogged") === "1",
            sort: isSort(sort) ? sort : DEFAULTS.sort,
        };
    }, [params]);

    const setQuery = useCallback(
        (patch: Partial<LibraryQuery>, options?: { replace?: boolean }) => {
            // Any filter change invalidates the page you were on, unless the
            // caller is explicitly the pager.
            const next: LibraryQuery = {
                ...query,
                ...patch,
                page: patch.page ?? 1,
            };

            const params = new URLSearchParams();
            if (next.page > 1) params.set("page", String(next.page));
            if (next.search) params.set("q", next.search);
            if (next.platform) params.set("platform", next.platform);
            if (next.genre) params.set("genre", next.genre);
            if (next.excludeLogged) params.set("hideLogged", "1");
            if (next.sort !== DEFAULTS.sort) params.set("sort", next.sort);

            setParams(params, { replace: options?.replace ?? false });
        },
        [query, setParams]
    );

    return { query, setQuery };
};
