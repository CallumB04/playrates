import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { useScrollMemory } from "./useScrollMemory";

let navigate: ReturnType<typeof useNavigate>;
const Probe = () => {
    useScrollMemory();
    navigate = useNavigate();
    return null;
};

const scrolledTo = vi.fn();

const scrollPageTo = (y: number) => {
    Object.defineProperty(window, "scrollY", { value: y, configurable: true });
    window.dispatchEvent(new Event("scroll"));
};

const start = (path = "/library") => {
    vi.spyOn(window, "scrollTo").mockImplementation(((
        options: ScrollToOptions
    ) => scrolledTo(options.top)) as typeof window.scrollTo);
    render(
        <MemoryRouter initialEntries={[path]}>
            <Probe />
        </MemoryRouter>
    );
    scrolledTo.mockClear();
};

afterEach(() => {
    vi.restoreAllMocks();
    scrolledTo.mockReset();
});

describe("useScrollMemory", () => {
    it("starts a new page at the top, and puts Back where it was left", () => {
        start();
        scrollPageTo(900);

        act(() => navigate("/game/1"));
        expect(scrolledTo).toHaveBeenLastCalledWith(0);

        act(() => navigate(-1));
        expect(scrolledTo).toHaveBeenLastCalledWith(900);
    });

    it("leaves the page where it is when only the query string changes", () => {
        start();
        scrollPageTo(400);

        act(() => navigate("/library?sort=title"));

        expect(scrolledTo).not.toHaveBeenCalled();
    });
});
