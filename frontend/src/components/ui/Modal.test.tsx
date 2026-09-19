import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import Modal from "./Modal";

describe("Modal", () => {
    it("renders into a portal on document.body", () => {
        render(
            <Modal onClose={vi.fn()}>
                <p>content</p>
            </Modal>
        );

        const dialog = screen.getByRole("dialog");
        expect(dialog).toBeInTheDocument();
        // the backdrop is a direct child of body, not of the render container
        expect(dialog.parentElement?.parentElement).toBe(document.body);
    });

    it("is announced as a modal dialog", () => {
        render(
            <Modal onClose={vi.fn()} labelledBy="title">
                <h2 id="title">Delete Log</h2>
            </Modal>
        );

        const dialog = screen.getByRole("dialog");
        expect(dialog).toHaveAttribute("aria-modal", "true");
        expect(dialog).toHaveAttribute("aria-labelledby", "title");
    });

    it("closes on Escape", () => {
        const onClose = vi.fn();
        render(
            <Modal onClose={onClose}>
                <p>content</p>
            </Modal>
        );

        fireEvent.keyDown(document, { key: "Escape" });
        expect(onClose).toHaveBeenCalledOnce();
    });

    it("closes when the backdrop is pressed", () => {
        const onClose = vi.fn();
        render(
            <Modal onClose={onClose}>
                <p>content</p>
            </Modal>
        );

        fireEvent.mouseDown(screen.getByRole("dialog").parentElement!);
        expect(onClose).toHaveBeenCalledOnce();
    });

    /** The stopPropagation that every popup used to repeat by hand. */
    it("does not close when the panel itself is pressed", () => {
        const onClose = vi.fn();
        render(
            <Modal onClose={onClose}>
                <p>content</p>
            </Modal>
        );

        fireEvent.mouseDown(screen.getByRole("dialog"));
        expect(onClose).not.toHaveBeenCalled();
    });

    it("locks and restores body scrolling", () => {
        const { unmount } = render(
            <Modal onClose={vi.fn()}>
                <p>content</p>
            </Modal>
        );

        expect(document.body.style.overflow).toBe("hidden");
        unmount();
        expect(document.body.style.overflow).not.toBe("hidden");
    });

    it("renders a labelled close button by default", () => {
        render(
            <Modal onClose={vi.fn()}>
                <p>content</p>
            </Modal>
        );

        expect(screen.getByLabelText(/close/i)).toBeInTheDocument();
    });

    it("can omit the close button", () => {
        render(
            <Modal onClose={vi.fn()} showCloseButton={false}>
                <p>content</p>
            </Modal>
        );

        expect(screen.queryByLabelText(/close/i)).toBeNull();
    });

    it("keeps the popup classes so the styling is unchanged", () => {
        render(
            <Modal onClose={vi.fn()} className="w-[600px]">
                <p>content</p>
            </Modal>
        );

        const dialog = screen.getByRole("dialog");
        expect(dialog.className).toContain("popup");
        expect(dialog.className).toContain("popup-default");
        expect(dialog.className).toContain("w-[600px]");
        expect(dialog.parentElement!.className).toContain("popup-backdrop");
    });
});
