import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import {
    groupPatchNote,
    isExternalHref,
    paragraphsOf,
    PATCH_NOTE_KIND_LABELS,
    type PatchNote,
    type PatchNoteItem,
} from "@playrates/shared";
import { cn } from "../../../lib/cn";
import { withLinks } from "../withLinks";
import { KIND_STYLE } from "./kinds";

const LINK =
    "font-medium text-content underline decoration-subtle underline-offset-3 hover:decoration-current";

const ItemText = ({ item }: { item: PatchNoteItem }) => {
    if (!item.link) return <>{item.text}</>;
    return isExternalHref(item.link) ? (
        <a
            href={item.link}
            target="_blank"
            rel="noreferrer noopener"
            className={LINK}
        >
            {item.text}
            <ArrowUpRight
                size={13}
                aria-hidden
                className="ml-0.5 inline align-[-1px]"
            />
        </a>
    ) : (
        <Link to={item.link} className={LINK}>
            {item.text}
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

/** A release: its title, its messages, and its changes under their kinds. */
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
        {groupPatchNote(note.items).map(({ kind, items }) => {
            const style = KIND_STYLE[kind];
            const Icon = style.icon;
            return (
                <section key={kind} className="flex flex-col gap-2.5">
                    <h3
                        className={cn(
                            "flex items-center gap-2 self-start rounded-full py-1 pr-3 pl-2 text-label font-semibold",
                            style.tint,
                            style.text
                        )}
                    >
                        <Icon size={14} aria-hidden />
                        {PATCH_NOTE_KIND_LABELS[kind]}
                    </h3>
                    <ul className="flex flex-col gap-2">
                        {items.map((item, i) => (
                            <li
                                key={i}
                                className="flex gap-2.5 text-body text-content-secondary"
                            >
                                <span
                                    aria-hidden
                                    className={cn(
                                        "mt-[0.6em] size-1.5 shrink-0 rounded-full bg-current",
                                        style.text
                                    )}
                                />
                                <span className="min-w-0">
                                    <ItemText item={item} />
                                </span>
                            </li>
                        ))}
                    </ul>
                </section>
            );
        })}
        <Prose text={note.outro} />
    </div>
);

export default PatchNoteView;
