import { Link } from "react-router-dom";
import { ChevronRight, Megaphone } from "lucide-react";
import type { PatchNotesSummary } from "@playrates/shared";
import { relativeTime } from "../../lib/format";
import { cn } from "../../lib/cn";
import { threadPath } from "./paths";

interface PatchNotesCardProps {
    summary: PatchNotesSummary;
    /** `aside` sits in the side column; `banner` is the phone's one-liner. */
    variant: "aside" | "banner";
    className?: string;
}

/**
 * The way into the official patch notes. Ember rather than the brand's iris,
 * with a megaphone and an "Official" stamp, so it never reads as one more
 * thread in the list.
 */
const PatchNotesCard = ({
    summary,
    variant,
    className,
}: PatchNotesCardProps) => {
    const latest = summary.latest;
    const to = threadPath(summary.thread.id);
    const focus =
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

    if (variant === "banner") {
        return (
            <Link
                to={to}
                className={cn(
                    "flex min-h-14 items-center gap-3 rounded-lg border border-accent/40 bg-accent-quiet px-3 py-2.5 lift",
                    focus,
                    className
                )}
            >
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-content-on-solid">
                    <Megaphone size={16} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block text-label-sm font-semibold text-accent-content">
                        Official patch notes
                    </span>
                    <span className="block truncate text-body-sm font-medium text-content">
                        {latest?.title ?? summary.thread.title}
                    </span>
                </span>
                <ChevronRight
                    size={18}
                    aria-hidden
                    className="shrink-0 text-accent-content"
                />
            </Link>
        );
    }

    return (
        <Link
            to={to}
            className={cn(
                "group relative block overflow-hidden rounded-lg border border-accent/40 bg-surface-raised shadow-plate lift",
                "hover:-translate-y-px hover:shadow-lifted",
                focus,
                className
            )}
        >
            <span
                aria-hidden
                className="absolute inset-x-0 top-0 h-1 bg-accent"
            />
            <span className="flex flex-col gap-3 p-4 pt-5">
                <span className="flex items-center justify-between gap-2">
                    <span className="grid size-10 place-items-center rounded-full bg-accent text-content-on-solid">
                        <Megaphone size={18} aria-hidden />
                    </span>
                    <span className="stamp rounded-xs border border-accent/60 px-1.5 py-0.5 text-stamp font-semibold tracking-wider text-accent-content uppercase">
                        Official
                    </span>
                </span>
                <span>
                    <span className="block font-display text-base font-semibold text-content">
                        PlayRates patch notes
                    </span>
                    <span className="mt-0.5 block text-label-sm text-content-muted">
                        What changed, from the people who changed it.
                    </span>
                </span>
                {latest && (
                    <span className="rounded-md bg-accent-quiet px-3 py-2">
                        <span className="block text-label-sm text-accent-content">
                            Latest · {relativeTime(latest.createdAt)}
                        </span>
                        <span className="block truncate text-body-sm font-semibold text-content">
                            {latest.title ?? "Untitled release"}
                        </span>
                    </span>
                )}
                <span className="inline-flex items-center gap-1 text-label font-medium text-accent-content group-hover:underline">
                    Read the notes
                    <ChevronRight size={14} aria-hidden />
                </span>
            </span>
        </Link>
    );
};

export default PatchNotesCard;
