import { useWindowSize } from "../../hooks/useWindowSize";
import type { PaginationState } from "../../hooks/usePagination";

interface PaginationProps {
    pagination: PaginationState;
    /** Ran after a page change, e.g. to scroll back to the top. */
    onChange?: () => void;
}

/**
 * The same block was written out twice, in ProfilePage and LibraryPage,
 * including the disabled styling and the label/arrow swap at sm.
 *
 * Behaviour change: the buttons now carry a real `disabled` attribute. They
 * previously stayed enabled and their handler did nothing, so they were
 * focusable and clickable at the ends of the range.
 */
const Pagination = ({ pagination, onChange }: PaginationProps) => {
    const { width } = useWindowSize();
    const showLabels = width >= 640;
    const { page, pageCount, canPrev, canNext, prev, next } = pagination;

    const enabledStyles =
        "border-content text-content hover:border-brand hover:text-brand";
    const disabledStyles = "border-content-disabled text-content-disabled";

    const handle = (move: () => void) => () => {
        move();
        onChange?.();
    };

    return (
        <div className="mx-auto mb-4 mt-12 flex w-max items-center justify-center gap-6">
            <button
                className={`${canPrev ? enabledStyles : disabledStyles} button-outline flex h-10 w-16 items-center justify-center sm:w-28`}
                onClick={handle(prev)}
                disabled={!canPrev}
                aria-label="Previous page"
            >
                {showLabels ? (
                    "Previous"
                ) : (
                    <i
                        className="fas fa-arrow-left text-lg"
                        aria-hidden="true"
                    ></i>
                )}
            </button>

            <p className="font-lexend text-content sm:text-lg">
                Page {page} of {pageCount}
            </p>

            <button
                className={`button-outline flex h-10 w-16 items-center justify-center sm:w-28 ${canNext ? enabledStyles : disabledStyles} `}
                onClick={handle(next)}
                disabled={!canNext}
                aria-label="Next page"
            >
                {showLabels ? (
                    "Next"
                ) : (
                    <i
                        className="fas fa-arrow-right text-lg"
                        aria-hidden="true"
                    ></i>
                )}
            </button>
        </div>
    );
};

export default Pagination;
