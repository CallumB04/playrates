import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import type { Platform } from "@playrates/shared";
import { platformIcon } from "../../lib/platformIcons";
import { cn } from "../../lib/cn";
import { fieldClass } from "./Input";

interface PlatformPickerProps {
    platforms: Platform[];
    value: string;
    onChange: (slug: string) => void;
    /** Shown when nothing is picked. */
    placeholder?: string;
    id?: string;
    "aria-labelledby"?: string;
}

/**
 * A listbox, not a `<select>`.
 *
 * The platform is the one field where the brand mark is doing real work — it
 * is faster to find Steam by its logo than by reading seven labels — and a
 * native select cannot render anything but text in its options.
 */
const PlatformPicker = ({
    platforms,
    value,
    onChange,
    placeholder = "Not set",
    id,
    ...aria
}: PlatformPickerProps) => {
    const [open, setOpen] = useState(false);
    const wrapRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (event: MouseEvent) => {
            if (!wrapRef.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOpen(false);
        };
        document.addEventListener("mousedown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("mousedown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [open]);

    const selected = platforms.find((p) => p.slug === value);
    const SelectedIcon = selected ? platformIcon(selected.slug) : null;

    const pick = (slug: string) => {
        onChange(slug);
        setOpen(false);
    };

    return (
        <div ref={wrapRef} className="relative">
            <button
                type="button"
                id={id}
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="listbox"
                aria-expanded={open}
                {...aria}
                className={fieldClass(
                    cn(
                        "flex cursor-pointer items-center gap-2 pr-9 text-left",
                        open && "border-brand shadow-glow"
                    )
                )}
            >
                {SelectedIcon && (
                    <SelectedIcon size={15} className="shrink-0 text-content-secondary" />
                )}
                <span
                    className={cn(
                        "truncate",
                        !selected && "text-content-muted"
                    )}
                >
                    {selected?.displayName ?? placeholder}
                </span>
                <ChevronDown
                    size={14}
                    aria-hidden
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-content-muted"
                />
            </button>

            {open && (
                <ul
                    role="listbox"
                    className="animate-settle absolute left-0 right-0 top-[calc(100%+0.35rem)] z-30 max-h-64 overflow-y-auto rounded-md border border-subtle bg-surface-raised py-1 shadow-modal"
                >
                    {/* Clearing is a real choice: a log does not have to say
                        where it was played. */}
                    <li>
                        <button
                            type="button"
                            role="option"
                            aria-selected={!value}
                            onClick={() => pick("")}
                            className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left text-body-sm text-content-muted hover:bg-surface-hover"
                        >
                            <span className="size-[15px] shrink-0" />
                            {placeholder}
                            {!value && (
                                <Check size={14} className="ml-auto text-brand" />
                            )}
                        </button>
                    </li>
                    {platforms.map((platform) => {
                        const Icon = platformIcon(platform.slug);
                        const isSelected = platform.slug === value;
                        return (
                            <li key={platform.slug}>
                                <button
                                    type="button"
                                    role="option"
                                    aria-selected={isSelected}
                                    onClick={() => pick(platform.slug)}
                                    className={cn(
                                        "flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left text-body-sm hover:bg-surface-hover",
                                        isSelected
                                            ? "text-content"
                                            : "text-content-secondary"
                                    )}
                                >
                                    <Icon size={15} className="shrink-0" />
                                    {platform.displayName}
                                    {isSelected && (
                                        <Check
                                            size={14}
                                            className="ml-auto text-brand"
                                        />
                                    )}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};

export default PlatformPicker;
