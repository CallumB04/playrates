import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { figureClass } from "../../../components/ui/Figure";
import { cn } from "../../../lib/cn";

/**
 * A figure, what it counts, and a line of context under it, which opens the
 * detail behind it. The chevron stands rather than appearing on hover: the
 * figure has to say it opens on a phone too.
 */
const StatButton = ({
    value,
    label,
    note,
    onOpen,
    className,
}: {
    value: ReactNode;
    label: string;
    note?: ReactNode;
    onOpen: () => void;
    className?: string;
}) => (
    <button
        type="button"
        onClick={onOpen}
        aria-haspopup="dialog"
        className={cn(
            "group -mx-2 flex min-w-0 cursor-pointer flex-col rounded-md px-2 py-2 text-left lift hover:bg-surface-hover",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
            className
        )}
    >
        <span className={figureClass("lg", "truncate leading-none")}>
            {value}
        </span>
        <span className="mt-1.5 flex items-center gap-0.5 text-label-sm text-content-muted group-hover:text-content-secondary">
            {label}
            <ChevronRight
                size={12}
                aria-hidden
                className="shrink-0 transition-transform group-hover:translate-x-0.5"
            />
        </span>
        {note && (
            <span className="mt-1 text-label-sm text-content-muted">
                {note}
            </span>
        )}
    </button>
);

export default StatButton;
