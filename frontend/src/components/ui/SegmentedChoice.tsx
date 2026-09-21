import type { LucideIcon } from "lucide-react";
import { cn } from "../../lib/cn";

export interface Segment<T extends string> {
    value: T;
    label: string;
    icon?: LucideIcon;
}

interface SegmentedChoiceProps<T extends string> {
    segments: Segment<T>[];
    value: T;
    onChange: (value: T) => void;
    label: string;
    className?: string;
}

/** A short, fixed set of options where seeing all of them beats opening a menu. */
const SegmentedChoice = <T extends string>({
    segments,
    value,
    onChange,
    label,
    className,
}: SegmentedChoiceProps<T>) => (
    <div
        role="radiogroup"
        aria-label={label}
        className={cn(
            "inline-flex gap-1 rounded-md border border-subtle bg-surface-sunken p-1",
            className
        )}
    >
        {segments.map(({ value: option, label: text, icon: Icon }) => {
            const isActive = option === value;
            return (
                <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    onClick={() => onChange(option)}
                    className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-sm px-3 py-1.5 text-body-sm lift",
                        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
                        isActive
                            ? "bg-surface-raised font-medium text-content inset-shadow-deep"
                            : "text-content-secondary hover:text-content"
                    )}
                >
                    {Icon && (
                        <Icon
                            size={14}
                            aria-hidden
                            className={cn("shrink-0", isActive && "text-brand")}
                        />
                    )}
                    {text}
                </button>
            );
        })}
    </div>
);

export default SegmentedChoice;
