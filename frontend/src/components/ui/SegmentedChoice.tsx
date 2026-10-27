import { useRef, type KeyboardEvent } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../../lib/cn";

export interface Segment<T extends string> {
    value: T;
    label: string;
    icon?: LucideIcon;
    /** A dot after the label: something behind this segment needs a look. */
    flagged?: boolean;
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
    /** Switches between panels rather than choosing a value: a tablist, each
     *  segment wired to the panel this names. */
    panelId?: (value: T) => string;
    className?: string;
}

/** A short, fixed set of options where seeing all of them beats opening a
 *  menu. With `panelId`, the same control as tabs over a set of views. */
const SegmentedChoice = <T extends string>({
    segments,
    value,
    onChange,
    label,
    fill = false,
    panelId,
    className,
}: SegmentedChoiceProps<T>) => {
    const tabs = !!panelId;
    const buttons = useRef<(HTMLButtonElement | null)[]>([]);

    // Tabs are one stop for Tab; the arrows move between them.
    const onKeyDown = (event: KeyboardEvent, index: number) => {
        if (!tabs) return;
        const step =
            event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
        if (!step) return;
        event.preventDefault();
        const next = (index + step + segments.length) % segments.length;
        onChange(segments[next]!.value);
        buttons.current[next]?.focus();
    };

    return (
        <div
            role={tabs ? "tablist" : "radiogroup"}
            aria-label={label}
            className={cn(
                "gap-1 rounded-md border border-subtle bg-surface-sunken p-1",
                fill ? "flex w-full" : "inline-flex",
                className
            )}
        >
            {segments.map(
                ({ value: option, label: text, icon: Icon, flagged }, i) => {
                    const isActive = option === value;
                    return (
                        <button
                            key={option}
                            ref={(node) => {
                                buttons.current[i] = node;
                            }}
                            type="button"
                            {...(tabs
                                ? {
                                      role: "tab",
                                      id: `${panelId(option)}-tab`,
                                      "aria-selected": isActive,
                                      "aria-controls": panelId(option),
                                      tabIndex: isActive ? 0 : -1,
                                  }
                                : { role: "radio", "aria-checked": isActive })}
                            onClick={() => onChange(option)}
                            onKeyDown={(event) => onKeyDown(event, i)}
                            className={cn(
                                "flex min-h-11 cursor-pointer items-center gap-2 rounded-sm px-3 py-1.5 text-body-sm lift sm:min-h-0",
                                fill && "flex-1 justify-center",
                                "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
                                isActive
                                    ? /* Flat, no inset rim: a highlight along
                                       the top edge alone shrinks the pill
                                       against the sunken track it sits in. */
                                      "bg-surface-raised font-medium text-content"
                                    : "text-content-secondary hover:text-content"
                            )}
                        >
                            {Icon && (
                                <Icon
                                    size={14}
                                    aria-hidden
                                    className={cn(
                                        "shrink-0",
                                        isActive && "text-brand"
                                    )}
                                />
                            )}
                            {text}
                            {flagged && (
                                <span className="size-1.5 shrink-0 rounded-full bg-danger">
                                    <span className="sr-only">
                                        (needs a look)
                                    </span>
                                </span>
                            )}
                        </button>
                    );
                }
            )}
        </div>
    );
};

export default SegmentedChoice;
