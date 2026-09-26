import type { ReactNode } from "react";
import type {
    RichTextBlock,
    RichTextDoc,
    RichTextInline,
} from "@playrates/shared";
import { cn } from "../../lib/cn";
import Spoiler from "./Spoiler";

/* Built from the JSON node by node, never set as HTML: the document came from
   another person's browser, and nothing in it becomes markup we did not
   write. A node this does not know renders as nothing. */

const MARK_TAGS: Partial<Record<string, "strong" | "em" | "u">> = {
    bold: "strong",
    italic: "em",
    underline: "u",
};

const renderInline = (node: RichTextInline, key: number): ReactNode => {
    if (node.type === "hardBreak") return <br key={key} />;
    if (node.type !== "text") return null;

    return (node.marks ?? []).reduce<ReactNode>((inner, mark) => {
        const Tag = MARK_TAGS[mark.type];
        return Tag ? <Tag>{inner}</Tag> : inner;
    }, node.text);
};

const isSpoiler = (node: RichTextInline) =>
    node.type === "text" &&
    (node.marks ?? []).some((m) => m.type === "spoiler");

/* A run of spoiled text is one cover, however it is formatted inside, so a
   spoiler with a bold word in it is one press and not three. */
const inlines = (content: RichTextInline[] | undefined) => {
    const out: ReactNode[] = [];
    let run: ReactNode[] = [];
    const closeRun = () => {
        if (run.length === 0) return;
        out.push(<Spoiler key={`s${out.length}`}>{run}</Spoiler>);
        run = [];
    };

    (content ?? []).forEach((node, i) => {
        const rendered = <span key={i}>{renderInline(node, i)}</span>;
        if (isSpoiler(node)) {
            run.push(rendered);
        } else {
            closeRun();
            out.push(rendered);
        }
    });
    closeRun();
    return out;
};

const HEADINGS = { 1: "h1", 2: "h2", 3: "h3" } as const;

const renderBlock = (block: RichTextBlock, key: number): ReactNode => {
    switch (block.type) {
        case "bulletList":
            return (
                <ul key={key}>
                    {block.content.map((item, i) => (
                        <li key={i}>{item.content.map(renderBlock)}</li>
                    ))}
                </ul>
            );
        case "orderedList":
            return (
                <ol key={key} start={block.attrs?.start ?? undefined}>
                    {block.content.map((item, i) => (
                        <li key={i}>{item.content.map(renderBlock)}</li>
                    ))}
                </ol>
            );
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
