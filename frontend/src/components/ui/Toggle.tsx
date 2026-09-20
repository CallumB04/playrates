import { cn } from "../../lib/cn";

interface ToggleProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label: string;
    /** "flanked" sets a word either side, as the day/night switch does. */
    labelPosition?: "after" | "hidden" | "flanked";
    /** The left-hand word when flanked. */
    offLabel?: string;
    disabled?: boolean;
    className?: string;
}

/**
 * The square switch. Off is a pressed well with a muted knob; on is a brand
 * plate with the knob thrown right — the same press gesture as everything
 * else, so it reads without the colour.
 */
const Toggle = ({
    checked,
    onChange,
    label,
    labelPosition = "after",
    offLabel,
    disabled = false,
    className,
}: ToggleProps) => {
    const control = (
        <span
            className={cn(
                "plate-press flex h-[18px] w-[34px] shrink-0 items-center border p-[2px]",
                checked
                    ? "justify-end border-brand-deep bg-brand"
                    : "justify-start border-strong bg-surface-sunken inset-shadow-field"
            )}
        >
            <span
                className={cn(
                    "size-3",
                    checked ? "bg-content-on-solid" : "bg-content-muted"
                )}
            />
        </span>
    );

    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={labelPosition === "hidden" ? label : undefined}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={cn(
                "inline-flex min-h-12 items-center gap-2.5 sm:min-h-0",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
                className
            )}
        >
            {labelPosition === "flanked" && (
                <span
                    className={cn(
                        "font-mono text-label-sm uppercase",
                        checked ? "text-content-muted" : "text-content"
                    )}
                >
                    {offLabel}
                </span>
            )}
            {control}
            {labelPosition !== "hidden" && (
                <span
                    className={cn(
                        labelPosition === "flanked"
                            ? "font-mono text-label-sm uppercase"
                            : "text-body-sm",
                        labelPosition === "flanked" && !checked
                            ? "text-content-muted"
                            : "text-content"
                    )}
                >
                    {label}
                </span>
            )}
        </button>
    );
};

export default Toggle;
