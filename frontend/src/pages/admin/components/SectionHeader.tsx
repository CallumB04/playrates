import type { ReactNode } from "react";
import { cn } from "../../../lib/cn";

/** The home page's rail header: a title, a quiet note beside it, and
 *  whatever controls the section has on the right. */
const SectionHeader = ({
    title,
    note,
    trailing,
    rule = false,
    className,
}: {
    title: string;
    note?: ReactNode;
    trailing?: ReactNode;
    /** A hairline under it, where the section below has no card of its own. */
    rule?: boolean;
    className?: string;
}) => (
    <header
        className={cn(
            "mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2",
            rule && "border-b border-subtle pb-2.5",
            className
        )}
    >
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <h2 className="font-display text-section text-content">{title}</h2>
            {note && (
                <span className="text-label text-content-muted">{note}</span>
            )}
        </div>
        {trailing}
    </header>
);

export default SectionHeader;
