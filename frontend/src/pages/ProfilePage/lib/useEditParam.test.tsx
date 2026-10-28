import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { useEditParam } from "./useEditParam";

const at = (path: string) => {
    const Wrapper = ({ children }: { children: ReactNode }) => (
        <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>
    );
    return Wrapper;
};

const use = (name: string) => ({
    edit: useEditParam(name),
    search: useLocation().search,
});

describe("useEditParam", () => {
    it("says whether the link asked for this picker", () => {
        const { result } = renderHook(() => use("showcase"), {
            wrapper: at("/user/me/badges?edit=showcase"),
        });
        expect(result.current.edit[0]).toBe(true);
    });

    it("takes the ask out of the URL once done, and keeps the rest", () => {
        const { result } = renderHook(() => use("showcase"), {
            wrapper: at("/user/me/badges?page=2&edit=showcase"),
        });
        act(() => result.current.edit[1]());
        expect(result.current.edit[0]).toBe(false);
        expect(result.current.search).toBe("?page=2");
    });

    it("leaves another picker's ask alone", () => {
        const { result } = renderHook(() => use("pinned_reviews"), {
            wrapper: at("/user/me?edit=showcase"),
        });
        expect(result.current.edit[0]).toBe(false);
        act(() => result.current.edit[1]());
        expect(result.current.search).toBe("?edit=showcase");
    });
});
