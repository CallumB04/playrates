import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import {
    groupedItems,
    isExternalHref,
    paragraphsOf,
    type PatchNote,
    type PatchNoteItem,
} from "@playrates/shared";
import { cn } from "../../../lib/cn";
import { withLinks } from "../withLinks";
import KindTag from "./KindTag";
import { KIND_TONES } from "./kindTones";

/* Each change branches off its section's line, as a timeline does: a short
   rule from the line to the change's first line of text, as thick as the
   line and in its colour. Drawn on the row, so a linked row's hover keeps
   it. */
const ROW =
    "relative flex items-start gap-3 rounded-md px-2.5 py-2 text-body text-content-secondary " +
    "before:absolute before:-left-1 before:top-[calc(0.5rem+0.5lh-1px)] before:h-0.5 before:w-1.5 before:content-['']";

/** One change, as said. Its kind is the heading it sits under. */
const ItemRow = ({ item }: { item: PatchNoteItem }) => {
    const row = cn(ROW, KIND_TONES[item.kind].branch);
    const body: ReactNode = <span className="min-w-0 flex-1">{item.text}</span>;
    if (!item.link) return <div className={row}>{body}</div>;

    const external = isExternalHref(item.link);
    const Arrow = external ? ArrowUpRight : ArrowRight;
    const linked = cn(
        row,
        "group min-h-11 lift hover:bg-surface-hover",
        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
    );
    const arrow = (
        <Arrow
            size={16}
            aria-hidden
            className="mt-1 shrink-0 text-content-muted group-hover:text-content"
        />
    );
    return external ? (
        <a
            href={item.link}
            target="_blank"
            rel="noreferrer noopener"
            className={linked}
        >
            {body}
            {arrow}
        </a>
    ) : (
        <Link to={item.link} className={linked}>
            {body}
            {arrow}
        </Link>
    );
};

const Prose = ({ text }: { text: string | null }) =>
    paragraphsOf(text).map((p, i) => (
        // rich-text for its links, styled as they are in any message.
        <p key={i} className="rich-text max-w-prose whitespace-pre-line">
            {withLinks(p)}
        </p>
    ));

/** A release: its title, its messages, and its changes under a heading
 *  for each kind: new first, then improved, fixed, removed and the rest. */
const PatchNoteView = ({
    note,
    showTitle = true,
    className,
}: {
    note: PatchNote;
    /** Off where the title is drawn above it, as the release's heading. */
    showTitle?: boolean;
    className?: string;
}) => (
    <div className={cn("flex flex-col gap-4", className)}>
        {showTitle && (
            <h2 className="font-display text-section text-content">
                {note.title}
            </h2>
        )}
        <Prose text={note.intro} />
        {groupedItems(note.items).map(({ kind, items }) => (
            <section key={kind} className="flex flex-col gap-1">
                <h3>
                    <KindTag kind={kind} />
                </h3>
                {/* Down from the ring's middle, in its colour: the changes
                    hang off their heading, and the text lines up with its
                    name. */}
                <ul
                    className={cn(
                        "ml-1 flex flex-col border-l-2 pl-1",
                        KIND_TONES[kind].rail
                    )}
                >
                    {items.map((item, i) => (
                        <li key={i}>
                            <ItemRow item={item} />
                        </li>
                    ))}
                </ul>
            </section>
        ))}
        <Prose text={note.outro} />
    </div>
);

export default PatchNoteView;
