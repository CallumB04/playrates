import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import {
    isExternalHref,
    paragraphsOf,
    type PatchNote,
    type PatchNoteItem,
} from "@playrates/shared";
import { cn } from "../../../lib/cn";
import { withLinks } from "../withLinks";
import KindTag from "./KindTag";

const ROW =
    "flex items-start gap-3 rounded-md px-2.5 py-2 text-body text-content-secondary";

/** One change: its kind, then what changed. The kinds a column from sm; on
 *  a phone the kind is a small line above, as beside the text it would
 *  leave the change a narrow strip. */
const ItemRow = ({ item }: { item: PatchNoteItem }) => {
    const body: ReactNode = (
        <span className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
            <KindTag kind={item.kind} className="sm:w-28 sm:shrink-0" />
            <span className="min-w-0">{item.text}</span>
        </span>
    );
    if (!item.link) return <div className={ROW}>{body}</div>;

    const external = isExternalHref(item.link);
    const Arrow = external ? ArrowUpRight : ArrowRight;
    const linked = cn(
        ROW,
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

/** A release: its title, its messages, and its changes as written. */
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
        {note.items.length > 0 && (
            // Pulled out by the rows' padding, so the text lines up with the
            // messages while a linked row's hover still has room.
            <ul className="-mx-2.5 flex flex-col">
                {note.items.map((item, i) => (
                    <li key={i}>
                        <ItemRow item={item} />
                    </li>
                ))}
            </ul>
        )}
        <Prose text={note.outro} />
    </div>
);

export default PatchNoteView;
