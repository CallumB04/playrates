import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Skeleton } from "./Skeleton";
import { figureClass } from "./Figure";
import { cn } from "../../lib/cn";

interface StatProps {
    label: string;
    /** Already formatted, or a node such as a rating badge. */
    value: ReactNode;
    /** A mark above the figure, where a row of stats wants telling apart. */
    icon?: LucideIcon;
    /** Holds the figure's place until it arrives. A figure nobody has fetched
     *  yet is not zero, and not an em dash either — both read as an answer. */
    loading?: boolean;
    className?: string;
}

/** A figure with its label under it. The figure leads; the label says what it
 *  is and does not compete. */
const Stat = ({
    label,
    value,
    icon: Icon,
    loading = false,
    className,
}: StatProps) => (
    <div className={cn("min-w-0", className)}>
        {Icon && (
            <Icon
                size={14}
                aria-hidden
                className="mb-1.5 block text-content-muted"
            />
        )}
        <p className={figureClass("lg", "truncate leading-none")}>
            {loading ? (
                // 1em, so the placeholder is exactly as tall as the figure.
                <Skeleton className="inline-block h-[1em] w-14 align-top" />
            ) : (
                value
            )}
        </p>
        <p className="mt-1.5 truncate text-label-sm text-content-muted">
            {label}
        </p>
    </div>
);

export default Stat;
