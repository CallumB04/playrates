import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render } from "@testing-library/react";
import ArtBackdrop from "./ArtBackdrop";

const pictures = (container: HTMLElement) =>
    [...container.querySelectorAll("img")].map((img) => img.src);

afterEach(() => vi.useRealTimers());

describe("ArtBackdrop", () => {
    it("keeps the last picture under a new one until the new one has faded in", () => {
        vi.useFakeTimers();
        const { container, rerender } = render(
            <ArtBackdrop url="https://example.test/a.jpg" />
        );
        fireEvent.load(container.querySelector("img")!);
        act(() => vi.advanceTimersByTime(500));

        rerender(<ArtBackdrop url="https://example.test/b.jpg" />);
        expect(pictures(container)).toHaveLength(2);
        expect(pictures(container)[0]).toContain("a.jpg");

        // Not loaded yet: the old one stays, however long it takes.
        act(() => vi.advanceTimersByTime(2000));
        expect(pictures(container)).toHaveLength(2);

        fireEvent.load(container.querySelectorAll("img")[1]!);
        act(() => vi.advanceTimersByTime(500));
        expect(pictures(container)).toEqual([expect.stringContaining("b.jpg")]);
    });

    it("draws nothing for a game without art", () => {
        const { container } = render(<ArtBackdrop url={null} />);
        expect(container).toBeEmptyDOMElement();
    });
});
