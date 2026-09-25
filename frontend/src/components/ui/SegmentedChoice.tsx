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
    /** Segments share the width equally rather than sizing to their labels.
     *  For a control that spans its container, where ragged segments read as
     *  a mistake. */
    fill?: boolean;
    className?: string;
}

/** A short, fixed set of options where seeing all of them beats opening a menu. */
const SegmentedChoice = <T extends string>({
    segments,
    value,
    onChange,
    label,
    fill = false,
    className,
}: SegmentedChoiceProps<T>) => (
    <div
        role="radiogroup"
        aria-label={label}
        className={cn(
            "gap-1 rounded-md border border-subtle bg-surface-sunken p-1",
            fill ? "flex w-full" : "inline-flex",
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
                        "flex min-h-11 cursor-pointer items-center gap-2 rounded-sm px-3 py-1.5 text-body-sm lift sm:min-h-0",
                        fill && "flex-1 justify-center",
                        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
                        isActive
                            /* Flat, no inset rim: a highlight along the top
                               edge alone shrinks the pill against the sunken
                               track it sits in. */
                            ? "bg-surface-raised font-medium text-content"
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
