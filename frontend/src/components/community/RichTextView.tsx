import type { ReactNode } from "react";
import type {
    RichTextBlock,
    RichTextDoc,
    RichTextInline,
} from "@playrates/shared";
import { cn } from "../../lib/cn";

/* Built from the JSON node by node, never set as HTML: the document came from
   another person's browser, and nothing in it becomes markup we did not
   write. A node this does not know renders as nothing. */

const MARK_TAGS = { bold: "strong", italic: "em", underline: "u" } as const;

const renderInline = (node: RichTextInline, key: number): ReactNode => {
    if (node.type === "hardBreak") return <br key={key} />;
    if (node.type !== "text") return null;

    return (node.marks ?? []).reduce<ReactNode>((inner, mark) => {
        const Tag = MARK_TAGS[mark.type];
        return Tag ? <Tag>{inner}</Tag> : inner;
    }, node.text);
};

const inlines = (content: RichTextInline[] | undefined) =>
    (content ?? []).map((node, i) => (
        <span key={i}>{renderInline(node, i)}</span>
    ));

const HEADINGS = { 1: "h1", 2: "h2", 3: "h3" } as const;

const renderBlock = (block: RichTextBlock, key: number): ReactNode => {
    switch (block.type) {
        case "paragraph":
            return <p key={key}>{inlines(block.content)}</p>;
        case "heading": {
            const Tag = HEADINGS[block.attrs.level] ?? "h3";
            return <Tag key={key}>{inlines(block.content)}</Tag>;
        }
        case "image":
            return (
                <img
                    key={key}
                    src={block.attrs.src}
                    alt={block.attrs.alt ?? ""}
                    loading="lazy"
                />
            );
        default:
            return null;
    }
};

interface RichTextViewProps {
    doc: RichTextDoc;
    className?: string;
}

const RichTextView = ({ doc, className }: RichTextViewProps) => (
    <div className={cn("rich-text text-body", className)}>
        {(doc.content ?? []).map(renderBlock)}
    </div>
);

export default RichTextView;
