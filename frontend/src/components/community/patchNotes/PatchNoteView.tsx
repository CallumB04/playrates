import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import {
    isExternalHref,
    paragraphsOf,
    PATCH_NOTE_KIND_NAMES,
    type PatchNote,
    type PatchNoteItem,
} from "@playrates/shared";
import { cn } from "../../../lib/cn";
import { withLinks } from "../withLinks";
import { KIND_STYLE } from "./kinds";

const KindTag = ({ kind }: { kind: PatchNoteItem["kind"] }) => {
    const style = KIND_STYLE[kind];
    const Icon = style.icon;
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 rounded-full py-0.5 pr-2.5 pl-2 text-label-sm font-semibold",
                style.tint,
                style.text
            )}
        >
            <Icon size={13} aria-hidden />
            {PATCH_NOTE_KIND_NAMES[kind]}
        </span>
    );
};

const ROW =
    "flex items-start gap-3 rounded-md px-2.5 py-2 text-body text-content-secondary";

/** One change: its kind, then what changed. Beside each other from sm, the
 *  kinds a column; on a phone the kind leads the text's first line, as a
 *  column there would leave the text a narrow strip. */
const ItemRow = ({ item }: { item: PatchNoteItem }) => {
    const body: ReactNode = (
        <span className="min-w-0 flex-1 sm:flex sm:gap-3">
            <span className="mr-2 align-[1px] sm:mt-0.5 sm:mr-0 sm:w-28 sm:shrink-0 sm:align-baseline">
                <KindTag kind={item.kind} />
            </span>
            <span className="sm:min-w-0">{item.text}</span>
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
    className,
}: {
    note: PatchNote;
    className?: string;
}) => (
    <div className={cn("flex flex-col gap-4", className)}>
        <h2 className="font-display text-section text-content">{note.title}</h2>
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
