import {
    useEffect,
    useId,
    useRef,
    useState,
    type ComponentType,
    type KeyboardEvent,
    type SVGProps,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "../../lib/cn";
import { fieldClass } from "./Input";

type IconProps = SVGProps<SVGSVGElement> & { size?: number | string };

export interface DropdownOption {
    value: string;
    label: string;
    /** Optional mark shown in the list and on the closed control. */
    icon?: ComponentType<IconProps>;
    /** A second line in the list, for options that need explaining. */
    hint?: string;
}

interface DropdownProps {
    options: DropdownOption[];
    value: string;
    onChange: (value: string) => void;
    /** Shown when the value matches no option. */
    placeholder?: string;
    className?: string;
    /** Width of the popover. Defaults to the trigger's width. */
    menuClassName?: string;
    disabled?: boolean;
    id?: string;
    "aria-label"?: string;
    "aria-labelledby"?: string;
}

/**
 * The project's dropdown. A native `<select>` can't show an icon, a hint line
 * or a tick, so this owns the menu — which means the keyboard handling is
 * ours too: arrows move, Enter and Space commit, Escape closes, Home and End
 * jump to the ends.
 */
const Dropdown = ({
    options,
    value,
    onChange,
    placeholder = "Select",
    className,
    menuClassName,
    disabled = false,
    id,
    ...aria
}: DropdownProps) => {
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);
    const [rect, setRect] = useState<DOMRect | null>(null);
    const wrapRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const listId = useId();

    const selectedIndex = options.findIndex((o) => o.value === value);
    const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

    // Opening lands on what is already chosen, not on the first option.
    useEffect(() => {
        if (open) setActive(selectedIndex >= 0 ? selectedIndex : 0);
    }, [open, selectedIndex]);

    useEffect(() => {
        if (!open) return;

        const onPointerDown = (event: MouseEvent) => {
            const target = event.target as Node;
            if (
                !wrapRef.current?.contains(target) &&
                !listRef.current?.contains(target)
            ) {
                setOpen(false);
            }
        };

        // Portalled, so it doesn't move with the trigger — track and close.
        const track = () => {
            const box = wrapRef.current?.getBoundingClientRect();
            if (box) setRect(box);
        };

        track();
        document.addEventListener("mousedown", onPointerDown);
        window.addEventListener("resize", track);
        window.addEventListener("scroll", track, true);
        return () => {
            document.removeEventListener("mousedown", onPointerDown);
            window.removeEventListener("resize", track);
            window.removeEventListener("scroll", track, true);
        };
    }, [open]);

    // Keep the highlighted option in view when arrowing past the fold.
    useEffect(() => {
        if (!open) return;
        listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
    }, [open, active]);

    const commit = (index: number) => {
        const option = options[index];
        if (!option) return;
        onChange(option.value);
        setOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
        if (disabled) return;

        if (!open) {
            if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
                event.preventDefault();
                setOpen(true);
            }
            return;
        }

        switch (event.key) {
            case "ArrowDown":
                event.preventDefault();
                return setActive((i) => Math.min(options.length - 1, i + 1));
            case "ArrowUp":
                event.preventDefault();
                return setActive((i) => Math.max(0, i - 1));
            case "Home":
                event.preventDefault();
                return setActive(0);
            case "End":
                event.preventDefault();
                return setActive(options.length - 1);
            case "Enter":
            case " ":
                event.preventDefault();
                return commit(active);
            case "Escape":
                event.preventDefault();
                return setOpen(false);
            case "Tab":
                return setOpen(false);
        }
    };

    const SelectedIcon = selected?.icon;

    return (
        <div ref={wrapRef} className={cn("relative", className)}>
            <button
                type="button"
                id={id}
                disabled={disabled}
                onClick={() => setOpen((v) => !v)}
                onKeyDown={onKeyDown}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={open ? listId : undefined}
                {...aria}
                className={fieldClass(
                    cn(
                        "flex cursor-pointer items-center gap-2 pr-9 text-left",
                        open && "border-brand shadow-glow",
                        disabled && "cursor-not-allowed"
                    )
                )}
            >
                {SelectedIcon && (
                    <SelectedIcon
                        size={15}
                        aria-hidden
                        className="shrink-0 text-content-secondary"
                    />
                )}
                <span
                    className={cn(
                        "truncate",
                        !selected && "text-content-muted"
                    )}
                >
                    {selected?.label ?? placeholder}
                </span>
                <ChevronDown
                    size={14}
                    aria-hidden
                    className={cn(
                        "pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-content-muted transition-transform duration-200",
                        open && "rotate-180"
                    )}
                />
            </button>

            {open &&
                rect &&
                createPortal(
                    <ul
                        ref={listRef}
                        id={listId}
                        role="listbox"
                        aria-activedescendant={`${listId}-${active}`}
                        /* Fixed and portalled to the body, or a modal clips the
                           menu and counts it toward its scroll height. */
                        style={{
                            position: "fixed",
                            left: rect.left,
                            width: rect.width,
                            // Flip above the trigger when there is no room below.
                            ...(window.innerHeight - rect.bottom < 280 &&
                            rect.top > 280
                                ? { bottom: window.innerHeight - rect.top + 6 }
                                : { top: rect.bottom + 6 }),
                        }}
                        className={cn(
                            "z-[60] max-h-72 animate-settle overflow-y-auto rounded-md border border-subtle bg-surface-raised p-1 shadow-modal",
                            menuClassName
                        )}
                    >
                        {options.map((option, index) => {
                            const Icon = option.icon;
                            const isSelected = option.value === value;
                            const isActive = index === active;

                            return (
                                <li
                                    key={option.value}
                                    id={`${listId}-${index}`}
                                >
                                    <button
                                        type="button"
                                        role="option"
                                        aria-selected={isSelected}
                                        tabIndex={-1}
                                        onClick={() => commit(index)}
                                        onPointerEnter={() => setActive(index)}
                                        className={cn(
                                            "flex w-full cursor-pointer items-center gap-2.5 rounded-sm px-2.5 py-2 text-left text-body-sm transition-colors",
                                            isActive
                                                ? "bg-surface-hover text-content"
                                                : "text-content-secondary",
                                            isSelected && "text-content"
                                        )}
                                    >
                                        {Icon && (
                                            <Icon
                                                size={15}
                                                aria-hidden
                                                className="shrink-0"
                                            />
                                        )}
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate">
                                                {option.label}
                                            </span>
                                            {option.hint && (
                                                <span className="block truncate text-label-sm text-content-muted">
                                                    {option.hint}
                                                </span>
                                            )}
                                        </span>
                                        {isSelected && (
                                            <Check
                                                size={15}
                                                aria-hidden
                                                className="shrink-0 text-brand"
                                            />
                                        )}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>,
                    document.body
                )}
        </div>
    );
};

export default Dropdown;
