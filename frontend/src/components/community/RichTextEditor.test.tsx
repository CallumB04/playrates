import { beforeAll, describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RichTextDocSchema, type RichTextDoc } from "@playrates/shared";
import { renderWithProviders } from "../../test/renderWithProviders";
import RichTextEditor from "./RichTextEditor";

const START: RichTextDoc = {
    type: "doc",
    content: [
        { type: "paragraph", content: [{ type: "text", text: "Hello" }] },
    ],
};

/* ProseMirror measures the selection to scroll it into view after focus, and
   jsdom has no layout to measure: Range carries neither method. */
beforeAll(() => {
    const empty = () =>
        Object.assign([], { item: () => null }) as unknown as DOMRectList;
    Range.prototype.getClientRects ??= empty;
    Range.prototype.getBoundingClientRect ??= () => new DOMRect();
});

describe("RichTextEditor", () => {
    it("offers only the formatting the API accepts", () => {
        const warn = vi.spyOn(console, "warn");
        renderWithProviders(
            <RichTextEditor
                label="Message"
                initial={START}
                onChange={vi.fn()}
            />
        );

        const names = screen
            .getAllByRole("button")
            .map((b) => b.getAttribute("aria-label"));
        expect(names).toEqual([
            "Bold",
            "Italic",
            "Underline",
            "Spoiler",
            "Heading 1",
            "Heading 2",
            "Heading 3",
            "Add a picture",
        ]);
        expect(
            screen.getByRole("textbox", { name: "Message" })
        ).toHaveTextContent("Hello");
        // Tiptap warns on a duplicated or misconfigured extension.
        expect(warn).not.toHaveBeenCalled();
    });

    it("hands back a document the API accepts, formatting applied", async () => {
        const onChange = vi.fn();
        renderWithProviders(
            <RichTextEditor
                label="Message"
                initial={START}
                onChange={onChange}
            />
        );

        await userEvent.click(
            screen.getByRole("button", { name: "Heading 1" })
        );

        const doc = onChange.mock.lastCall?.[0] as RichTextDoc;
        expect(doc.content[0]).toMatchObject({
            type: "heading",
            attrs: { level: 1 },
        });
        // What the editor produces is what the API will take.
        expect(RichTextDocSchema.safeParse(doc).success).toBe(true);
    });

    it("sends on Ctrl+Enter or Cmd+Enter, and not on Enter alone", () => {
        const onSubmit = vi.fn();
        renderWithProviders(
            <RichTextEditor
                label="Message"
                initial={START}
                onChange={vi.fn()}
                onSubmit={onSubmit}
            />
        );
        const box = screen.getByRole("textbox", { name: "Message" });

        fireEvent.keyDown(box, { key: "Enter" });
        expect(onSubmit).not.toHaveBeenCalled();

        fireEvent.keyDown(box, { key: "Enter", ctrlKey: true });
        fireEvent.keyDown(box, { key: "Enter", metaKey: true });
        expect(onSubmit).toHaveBeenCalledTimes(2);
    });
});
