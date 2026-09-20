import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

interface LedgerRowProps {
    label: ReactNode;
    value: ReactNode;
    /** Hairline beneath the row; drop it on the last row of a group. */
    rule?: boolean;
    size?: "sm" | "base";
    className?: string;
}

const SIZE = {
    sm: { row: "py-1.5", label: "text-xs", value: "text-figure-sm" },
    base: { row: "py-2", label: "text-body-sm", value: "text-[12.5px]" },
} as const;

/**
 * Label left, dotted rule, figure right. Beneath every plate, facts are set
 * this way — it is the other half of the signature device.
 *
 * The leader is decorative, so a screen reader reads "Status, Mastered"
 * rather than announcing a run of dots.
 */
const LedgerRow = ({
    label,
    value,
    rule = true,
    size = "base",
    className,
}: LedgerRowProps) => {
    const s = SIZE[size];
    return (
        <div
            className={cn(
                "flex items-baseline gap-1.5",
                s.row,
                rule && "border-b border-subtle",
                className
            )}
        >
            <dt className={cn("whitespace-nowrap text-content-secondary", s.label)}>
                {label}
            </dt>
            <span className="leader" aria-hidden="true" />
            <dd className={cn("font-mono font-medium text-content", s.value)}>
                {value}
            </dd>
        </div>
    );
};

export const LedgerList = ({
    className,
    ...props
}: HTMLAttributes<HTMLDListElement>) => (
    <dl className={cn("flex flex-col", className)} {...props} />
);

export default LedgerRow;
