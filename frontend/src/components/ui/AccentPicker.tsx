import { useId } from "react";
import { Check } from "lucide-react";
import { PROFILE_ACCENTS, type ProfileAccent } from "@playrates/shared";
import { avatarGradient, hueFor } from "../../lib/profileAccent";
import { cn } from "../../lib/cn";

interface AccentPickerProps {
    /** Null is the colour the username hashes to, which is offered first. */
    value: ProfileAccent | null;
    onChange: (accent: ProfileAccent | null) => void;
    /** Needed to draw the default swatch as the colour it actually is. */
    username: string;
    label: string;
    disabled?: boolean;
    className?: string;
}

/**
 * The ten colours a profile can wear, plus the one it started with. Radios
 * rather than buttons: one of them is always the answer, and the arrow keys
 * should move between them.
 */
const AccentPicker = ({
    value,
    onChange,
    username,
    label,
    disabled = false,
    className,
}: AccentPickerProps) => {
    const name = useId();

    const swatches: { key: string; accent: ProfileAccent | null; label: string; hue: number }[] =
        [
            {
                key: "default",
                accent: null,
                label: "Default, from your username",
                hue: hueFor(username),
            },
            ...PROFILE_ACCENTS.map((a) => ({
                key: a.slug,
                accent: a.slug as ProfileAccent,
                label: a.label,
                hue: a.hue,
            })),
        ];

    return (
        <div
            role="radiogroup"
            aria-label={label}
            className={cn("flex flex-wrap gap-2", className)}
        >
            {swatches.map((swatch) => {
                const checked = value === swatch.accent;
                return (
                    <label
                        key={swatch.key}
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
                            value={swatch.key}
                            checked={checked}
                            disabled={disabled}
                            onChange={() => onChange(swatch.accent)}
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
