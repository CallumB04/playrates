import { useId } from "react";
import { Ban, Check } from "lucide-react";
import { PROFILE_ACCENTS, type ProfileAccent } from "@playrates/shared";
import { avatarGradient } from "../../lib/profileAccent";
import { cn } from "../../lib/cn";

interface CommonProps {
    label: string;
    disabled?: boolean;
    className?: string;
}

/** With `allowNone`, the first swatch is "no colour", for things that start
 *  neutral and needn't wear one: a list, say. */
type AccentPickerProps = CommonProps &
    (
        | {
              allowNone?: false;
              value: ProfileAccent;
              onChange: (accent: ProfileAccent) => void;
          }
        | {
              allowNone: true;
              value: ProfileAccent | null;
              onChange: (accent: ProfileAccent | null) => void;
          }
    );

/**
 * The colours a profile can wear. Radios rather than buttons: one of them is
 * always the answer, and the arrow keys should move between them.
 */
const AccentPicker = (props: AccentPickerProps) => {
    const { value, label, disabled = false, className } = props;
    const name = useId();
    const pick = (accent: ProfileAccent | null) => {
        if (props.allowNone) props.onChange(accent);
        else if (accent) props.onChange(accent);
    };
    const labelClass = cn(
        /* The swatch reads at 28px but the label is 44,
           so a fingertip has something to land on. */
        "relative grid size-11 shrink-0 place-items-center rounded-full",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
    );
    const dotClass = (checked: boolean) =>
        cn(
            "grid size-7 place-items-center rounded-full ring-offset-2 ring-offset-surface-raised transition-shadow",
            "peer-focus-visible:ring-2 peer-focus-visible:ring-brand",
            checked && "ring-2 ring-content"
        );

    return (
        <div
            role="radiogroup"
            aria-label={label}
            // The 44px labels space the dots already; seven to a phone's row.
            className={cn("flex flex-wrap gap-0.5 sm:gap-2", className)}
        >
            {props.allowNone && (
                <label title="None" className={labelClass}>
                    <input
                        type="radio"
                        name={name}
                        value=""
                        checked={value === null}
                        disabled={disabled}
                        onChange={() => pick(null)}
                        className="peer sr-only"
                    />
                    <span
                        aria-hidden
                        className={cn(
                            dotClass(value === null),
                            "border border-dashed border-strong text-content-muted"
                        )}
                    >
                        <Ban className="size-3.5" />
                    </span>
                    <span className="sr-only">None</span>
                </label>
            )}
            {PROFILE_ACCENTS.map((swatch) => {
                const checked = value === swatch.slug;
                return (
                    <label
                        key={swatch.slug}
                        title={swatch.label}
                        className={labelClass}
                    >
                        <input
                            type="radio"
                            name={name}
                            value={swatch.slug}
                            checked={checked}
                            disabled={disabled}
                            onChange={() => pick(swatch.slug)}
                            className="peer sr-only"
                        />
                        <span
                            aria-hidden
                            style={{ backgroundImage: avatarGradient(swatch.hue) }}
                            className={dotClass(checked)}
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
