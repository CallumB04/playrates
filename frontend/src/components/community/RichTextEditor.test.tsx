import { beforeAll, describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RichTextDocSchema, type RichTextDoc } from "@playrates/shared";
import { http, HttpResponse } from "msw";
import { server } from "../../test/msw/server";
import { API_BASE } from "../../test/msw/handlers";
import { renderWithProviders } from "../../test/renderWithProviders";
import RichTextEditor from "./RichTextEditor";

// jsdom has no canvas to shrink a picture on; the upload is what's tested.
vi.mock("../../lib/communityImage", () => ({
    compressCommunityImage: async (file: File) => file,
}));

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
            "Bulleted list",
            "Numbered list",
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

    it("makes a list the API accepts", async () => {
        const onChange = vi.fn();
        renderWithProviders(
            <RichTextEditor
                label="Message"
                initial={START}
                onChange={onChange}
            />
        );

        await userEvent.click(
            screen.getByRole("button", { name: "Bulleted list" })
        );

        const doc = onChange.mock.lastCall?.[0] as RichTextDoc;
        expect(doc.content[0]).toMatchObject({ type: "bulletList" });
        expect(RichTextDocSchema.safeParse(doc).success).toBe(true);
    });

    /* The thread page saves every change as a draft, and posting disables
       then re-enables the editor around the request. */
    it("doesn't report a change when it is only disabled and enabled", () => {
        const onChange = vi.fn();
        const { rerender } = renderWithProviders(
            <RichTextEditor
                label="Message"
                initial={START}
                onChange={onChange}
            />
        );

        rerender(
            <RichTextEditor
                label="Message"
                initial={START}
                onChange={onChange}
                disabled
            />
        );
        rerender(
            <RichTextEditor
                label="Message"
                initial={START}
                onChange={onChange}
            />
        );

        expect(onChange).not.toHaveBeenCalled();
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

    it("asks for a description of a picture once it's in", async () => {
        const url =
            "https://test.supabase.co/storage/v1/object/public/community-images/u/1.webp";
        server.use(
            http.post(`${API_BASE}/community/images`, () =>
                HttpResponse.json({ url }, { status: 201 })
            )
        );
        const onChange = vi.fn();
        const { container } = renderWithProviders(
            <RichTextEditor
                label="Message"
                initial={START}
                onChange={onChange}
            />
        );

        const input =
            container.querySelector<HTMLInputElement>('input[type="file"]')!;
        fireEvent.change(input, {
            target: {
                files: [new File(["x"], "shot.webp", { type: "image/webp" })],
            },
        });

        const field = await screen.findByLabelText("Picture description");
        await userEvent.type(field, "The final boss");

        const doc = onChange.mock.lastCall?.[0] as RichTextDoc;
        const image = JSON.stringify(doc);
        expect(image).toContain('"alt":"The final boss"');
        expect(RichTextDocSchema.safeParse(doc).success).toBe(true);
    });
});
