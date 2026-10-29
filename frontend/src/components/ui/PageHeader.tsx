import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { cn } from "../../lib/cn";

interface PageHeaderProps {
    title: ReactNode;
    /** A way back, over the title. */
    back?: { to: string; label: string };
    /** A line under the title: what the page is, or how much is on it. */
    note?: ReactNode;
    /** Beside the title from sm, under it on a phone. */
    actions?: ReactNode;
    className?: string;
}

/**
 * A page's own header, so every page opens the same way: one title size,
 * one way back, one line of note. Home and Progress keep headers of their
 * own, where the header is the point of the page.
 */
const PageHeader = ({
    title,
    back,
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
            {back && (
                <Link
                    to={back.to}
                    className="relative mb-2 inline-flex items-center gap-1.5 text-label text-content-muted before:absolute before:-inset-x-2 before:-inset-y-3.5 before:content-[''] hover:text-content"
                >
                    <ArrowLeft size={14} aria-hidden />
                    {back.label}
                </Link>
            )}
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
