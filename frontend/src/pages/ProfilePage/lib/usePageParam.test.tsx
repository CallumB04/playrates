import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { usePageParam } from "./usePageParam";

const setup = (initial = "/u/tester") => {
    const wrapper = ({ children }: { children: ReactNode }) => (
        <MemoryRouter initialEntries={[initial]}>{children}</MemoryRouter>
    );
    return renderHook(
        () => ({ page: usePageParam(), location: useLocation() }),
        { wrapper }
    );
};

describe("usePageParam", () => {
    it("reads the page from the URL", () => {
        const { result } = setup("/u/tester?page=3");
        expect(result.current.page[0]).toBe(3);
    });

    it.each(["", "?page=0", "?page=-2", "?page=abc"])(
        "falls back to the first page for %j",
        (search) => {
            const { result } = setup(`/u/tester${search}`);
            expect(result.current.page[0]).toBe(1);
        }
    );

    it("writes a later page beside the other params", () => {
        const { result } = setup("/u/tester?view=shelf");

        act(() => result.current.page[1](4));

        expect(result.current.location.search).toBe("?view=shelf&page=4");
        expect(result.current.page[0]).toBe(4);
    });

    it("takes the page out of the URL on the first page", () => {
        const { result } = setup("/u/tester?view=shelf&page=4");

        act(() => result.current.page[1](1));

        expect(result.current.location.search).toBe("?view=shelf");
    });
});
