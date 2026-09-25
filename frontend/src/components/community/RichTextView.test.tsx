import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { RichTextDoc } from "@playrates/shared";
import RichTextView from "./RichTextView";

describe("RichTextView", () => {
    it("renders headings, marks, breaks and pictures", () => {
        const doc: RichTextDoc = {
            type: "doc",
            content: [
                {
                    type: "heading",
                    attrs: { level: 2 },
                    content: [{ type: "text", text: "Patch 1.1" }],
                },
                {
                    type: "paragraph",
                    content: [
                        {
                            type: "text",
                            text: "bold",
                            marks: [{ type: "bold" }],
                        },
                        { type: "hardBreak" },
                        {
                            type: "text",
                            text: "both",
                            marks: [{ type: "italic" }, { type: "underline" }],
                        },
                    ],
                },
                {
                    type: "image",
                    attrs: { src: "https://cdn.test/a.webp", alt: "A map" },
                },
            ],
        };

        const { container } = render(<RichTextView doc={doc} />);

        expect(
            screen.getByRole("heading", { level: 2, name: "Patch 1.1" })
        ).toBeInTheDocument();
        expect(container.querySelector("strong")).toHaveTextContent("bold");
        expect(container.querySelector("u > em")).toHaveTextContent("both");
        expect(container.querySelector("br")).not.toBeNull();
        expect(screen.getByRole("img", { name: "A map" })).toHaveAttribute(
            "src",
            "https://cdn.test/a.webp"
        );
    });

    it("renders nothing for a node it does not know, and no raw HTML", () => {
        const doc = {
            type: "doc",
            content: [
                {
                    type: "codeBlock",
                    content: [{ type: "text", text: "rm -rf" }],
                },
                {
                    type: "paragraph",
                    content: [
                        { type: "text", text: "<script>alert(1)</script>" },
                    ],
                },
            ],
        } as unknown as RichTextDoc;

        const { container } = render(<RichTextView doc={doc} />);

        expect(container).not.toHaveTextContent("rm -rf");
        expect(container.querySelector("script")).toBeNull();
        expect(container).toHaveTextContent("<script>alert(1)</script>");
    });

    it("covers a run of spoiled words as one, held open by a press", async () => {
        const doc: RichTextDoc = {
            type: "doc",
            content: [
                {
                    type: "paragraph",
                    content: [
                        { type: "text", text: "The twist: " },
                        {
                            type: "text",
                            text: "the king",
                            marks: [{ type: "spoiler" }],
                        },
                        {
                            type: "text",
                            text: " was the ghost",
                            marks: [{ type: "spoiler" }, { type: "bold" }],
                        },
                    ],
                },
            ],
        };

        render(<RichTextView doc={doc} />);

        const covers = screen.getAllByRole("button", { name: /Spoiler/ });
        expect(covers).toHaveLength(1);
        // Named as a spoiler only, so the words are not read out.
        expect(covers[0]).toHaveAccessibleName("Spoiler. Press to reveal");

        await userEvent.click(covers[0]!);

        // Held open: the words are read out, and pressing again covers them.
        const held = screen.getByRole("button", { pressed: true });
        expect(held).toHaveAttribute("data-shown");
        expect(held).toHaveTextContent("the king was the ghost");

        await userEvent.click(held);
        expect(
            screen.getByRole("button", { name: "Spoiler. Press to reveal" })
        ).not.toHaveAttribute("data-shown");
    });
});
