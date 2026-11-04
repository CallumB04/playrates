import { Link } from "react-router-dom";
import { ArrowLeft, ChevronRight } from "lucide-react";
import type { Crumb } from "@playrates/shared";
import { cn } from "../../lib/cn";

/**
 * Where a page sits, over its title: every step a link but the last, which
 * is the page. A phone hasn't the width for the whole trail, so it shows
 * the step back alone.
 */
const Breadcrumbs = ({
    trail,
    className,
}: {
    trail: Crumb[];
    className?: string;
}) => {
    const back = trail.at(-2);
    if (!back) return null;

    return (
        <nav aria-label="Breadcrumb" className={cn("min-w-0", className)}>
            <Link
                to={back.path}
                className="inline-flex min-h-11 max-w-full items-center gap-1.5 text-label text-content-muted hover:text-content sm:hidden"
            >
                <ArrowLeft size={14} aria-hidden className="shrink-0" />
                <span className="truncate">{back.name}</span>
            </Link>
            <ol className="flex min-w-0 items-center gap-1.5 text-label text-content-muted max-sm:hidden">
                {trail.map((crumb, i) => {
                    const here = i === trail.length - 1;
                    return (
                        <li
                            key={crumb.path}
                            // The page itself gives way first, then the
                            // steps before it, so a long name can't push the
                            // trail off the page.
                            className={cn(
                                "flex min-w-0 items-center gap-1.5",
                                here ? "shrink-[2]" : "shrink"
                            )}
                        >
                            {here ? (
                                <span
                                    aria-current="page"
                                    className="truncate text-content-secondary"
                                >
                                    {crumb.name}
                                </span>
                            ) : (
                                <>
                                    <Link
                                        to={crumb.path}
                                        className="truncate hover:text-content"
                                    >
                                        {crumb.name}
                                    </Link>
                                    <ChevronRight
                                        size={12}
                                        aria-hidden
                                        className="shrink-0"
                                    />
                                </>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
};

export default Breadcrumbs;
