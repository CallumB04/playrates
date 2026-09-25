import { useId } from "react";
import { Check } from "lucide-react";
import { PROFILE_ACCENTS, type ProfileAccent } from "@playrates/shared";
import { avatarGradient } from "../../lib/profileAccent";
import { cn } from "../../lib/cn";

interface AccentPickerProps {
    value: ProfileAccent;
    onChange: (accent: ProfileAccent) => void;
    label: string;
    disabled?: boolean;
    className?: string;
}

/**
 * The colours a profile can wear. Radios rather than buttons: one of them is
 * always the answer, and the arrow keys should move between them.
 */
const AccentPicker = ({
    value,
    onChange,
    label,
    disabled = false,
    className,
}: AccentPickerProps) => {
    const name = useId();

    return (
        <div
            role="radiogroup"
            aria-label={label}
            className={cn("flex flex-wrap gap-2", className)}
        >
            {PROFILE_ACCENTS.map((swatch) => {
                const checked = value === swatch.slug;
                return (
                    <label
                        key={swatch.slug}
                        title={swatch.label}
                        className={cn(
                            /* The swatch reads at 28px but the label is 44,
                               so a fingertip has something to land on. */
                            "relative grid size-11 shrink-0 place-items-center rounded-full",
                            disabled
                                ? "cursor-not-allowed opacity-60"
                                : "cursor-pointer"
                        )}
                    >
                        <input
                            type="radio"
                            name={name}
                            value={swatch.slug}
                            checked={checked}
                            disabled={disabled}
                            onChange={() => onChange(swatch.slug)}
                            className="peer sr-only"
                        />
                        <span
                            aria-hidden
                            style={{ backgroundImage: avatarGradient(swatch.hue) }}
                            className={cn(
                                "grid size-7 place-items-center rounded-full ring-offset-2 ring-offset-surface-raised transition-shadow",
                                "peer-focus-visible:ring-2 peer-focus-visible:ring-brand",
                                checked && "ring-2 ring-content"
                            )}
                        >
                            {checked && (
                                <Check
                                    className="size-4 text-white drop-shadow"
                                    strokeWidth={3}
                                />
                            )}
                        </span>
                        <span className="sr-only">{swatch.label}</span>
                    </label>
                );
            })}
        </div>
    );
};

export default AccentPicker;
