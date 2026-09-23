import type { PaginationState } from "../../hooks/usePagination";
import { ELLIPSIS, pageRange } from "../../lib/pageRange";
import { formatCount } from "../../lib/format";
import { cn } from "../../lib/cn";

interface PaginationProps {
    pagination: PaginationState;
    /** Fires after any page change, e.g. to scroll back to the top. */
    onChange?: () => void;
    className?: string;
}

const SLOT =
    "lift grid place-items-center min-h-11 min-w-11 rounded-sm border px-2 text-center font-mono text-[12px] font-medium " +
    "sm:min-h-0 sm:min-w-[36px] sm:block sm:py-2 " +
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

const STEP =
    "border-subtle bg-surface-raised text-content-secondary hover:-translate-y-px hover:border-strong hover:text-content " +
    "disabled:border-subtle disabled:bg-transparent disabled:text-content-muted disabled:opacity-60";

/** "Showing 1–28 of 184,662" — the range this page actually covers. */
export const PaginationSummary = ({
    pagination: { page, perPage, total },
    className,
}: {
    pagination: PaginationState;
    className?: string;
}) => {
    if (total === 0) return null;
    const first = (page - 1) * perPage + 1;
    const last = Math.min(page * perPage, total);
    return (
        <p className={cn("text-label text-content-muted", className)}>
            Showing {formatCount(first)}–{formatCount(last)} of{" "}
            {formatCount(total)}
        </p>
    );
};

const Pagination = ({ pagination, onChange, className }: PaginationProps) => {
    const { page, pageCount, canPrev, canNext, next, prev, setPage } =
        pagination;
    if (pageCount <= 1) return null;

    const go = (fn: () => void) => () => {
        fn();
        onChange?.();
    };

    return (
        <nav
            aria-label="Pagination"
            /* Wraps: a six-digit last page pushed "next" off screen at 375px. */
            className={cn("flex flex-wrap gap-[3px]", className)}
        >
            <button
                type="button"
                onClick={go(prev)}
                disabled={!canPrev}
                aria-label="Previous page"
                className={cn(SLOT, STEP)}
            >
                ‹
            </button>

            {pageRange(page, pageCount).map((slot, i) =>
                slot === ELLIPSIS ? (
                    <span
                        key={`gap-${i}`}
                        aria-hidden="true"
                        className={cn(
                            SLOT,
                            "border-transparent text-content-muted"
                        )}
                    >
                        {ELLIPSIS}
                    </span>
                ) : (
                    <button
                        key={slot}
                        type="button"
                        onClick={go(() => setPage(slot))}
                        aria-label={`Page ${slot}`}
                        aria-current={slot === page ? "page" : undefined}
                        className={cn(
                            SLOT,
                            slot === page
                                ? "border-brand-deep bg-brand text-content-on-solid shadow-plate"
                                : STEP
                        )}
                    >
                        {formatCount(slot)}
                    </button>
                )
            )}

            <button
                type="button"
                onClick={go(next)}
                disabled={!canNext}
                aria-label="Next page"
                className={cn(SLOT, STEP)}
            >
                ›
            </button>
        </nav>
    );
};

export default Pagination;
