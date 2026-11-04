import type { ReactNode } from "react";
import type { Crumb } from "@playrates/shared";
import { cn } from "../../lib/cn";
import Breadcrumbs from "./Breadcrumbs";

interface PageHeaderProps {
    title: ReactNode;
    /** Where the page sits, over the title. */
    trail?: Crumb[];
    /** A line under the title: what the page is, or how much is on it. */
    note?: ReactNode;
    /** Beside the title from sm, under it on a phone. */
    actions?: ReactNode;
    className?: string;
}

/**
 * A page's own header, so every page opens the same way: one title size,
 * one trail back, one line of note. Home and Progress keep headers of their
 * own, where the header is the point of the page.
 */
const PageHeader = ({
    title,
    trail,
    note,
    actions,
    className,
}: PageHeaderProps) => (
    <header
        className={cn(
            "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
            className
        )}
    >
        <div className="min-w-0">
            {trail && <Breadcrumbs trail={trail} className="mb-2" />}
            <h1 className="font-display text-title text-content">{title}</h1>
            {note && (
                <div className="mt-2 max-w-[56ch] text-body-sm text-content-secondary">
                    {note}
                </div>
            )}
        </div>
        {actions && (
            <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
                {actions}
            </div>
        )}
    </header>
);

export default PageHeader;
