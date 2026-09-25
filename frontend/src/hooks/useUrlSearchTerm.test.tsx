import { describe, expect, it } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { useUrlSearchTerm } from "./useUrlSearchTerm";

const setup = (initial = "/community") => {
    const wrapper = ({ children }: { children: ReactNode }) => (
        <MemoryRouter initialEntries={[initial]}>{children}</MemoryRouter>
    );
    return renderHook(
        () => ({
            search: useUrlSearchTerm("q", { delay: 10, alsoClear: ["page"] }),
            location: useLocation(),
            navigate: useNavigate(),
        }),
        { wrapper }
    );
};

describe("useUrlSearchTerm", () => {
    it("starts from the term already in the URL", () => {
        const { result } = setup("/community?q=hollow");
        expect(result.current.search.term).toBe("hollow");
        expect(result.current.search.value).toBe("hollow");
    });

    it("settles what is typed into the URL, clearing the page with it", async () => {
        const { result } = setup("/community?page=3");

        act(() => result.current.search.setTerm("  radiance "));

        await waitFor(() =>
            expect(result.current.location.search).toBe("?q=radiance")
        );
        expect(result.current.search.value).toBe("radiance");
    });

    it("takes the term back out when the box is emptied", async () => {
        const { result } = setup("/community?q=hollow");

        act(() => result.current.search.setTerm(""));

        await waitFor(() => expect(result.current.location.search).toBe(""));
    });

    it("empties the box when the URL loses the term from elsewhere", async () => {
        const { result } = setup("/community?q=hollow");

        act(() => result.current.navigate("/community"));

        await waitFor(() => expect(result.current.search.term).toBe(""));
        // and does not push the old term back
        await new Promise((r) => setTimeout(r, 30));
        expect(result.current.location.search).toBe("");
    });
});
