import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useScrollToHash } from "./useScrollToHash";

const Page = ({ late }: { late?: boolean }) => {
    useScrollToHash();
    return late ? null : <section id="name">Name</section>;
};

const at = (path: string, late = false) =>
    render(
        <MemoryRouter initialEntries={[path]}>
            <Page late={late} />
        </MemoryRouter>
    );

describe("useScrollToHash", () => {
    it("scrolls to what the hash names", () => {
        const scroll = vi.fn();
        Element.prototype.scrollIntoView = scroll;
        at("/progress#name");
        expect(scroll).toHaveBeenCalledWith({ block: "start" });
    });

    it("waits for an element that isn't drawn yet, and gives up after", () => {
        vi.useFakeTimers();
        const scroll = vi.fn();
        Element.prototype.scrollIntoView = scroll;
        const { unmount } = at("/progress#name", true);
        vi.advanceTimersByTime(4000);
        expect(scroll).not.toHaveBeenCalled();
        unmount();
        vi.useRealTimers();
    });

    it("does nothing without a hash", () => {
        const scroll = vi.fn();
        Element.prototype.scrollIntoView = scroll;
        at("/progress");
        expect(scroll).not.toHaveBeenCalled();
    });
});
