import { useId, type InputHTMLAttributes, type ReactNode } from "react";

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
    /** Rendered inside the field wrapper, e.g. the show/hide password button. */
    adornment?: ReactNode;
}

/** aria-invalid and aria-describedby are wired up so screen readers announce
 *  the error rather than it just appearing. */
const FormField = ({
    label,
    error,
    adornment,
    className,
    ...inputProps
}: FormFieldProps) => {
    const id = useId();
    const errorId = `${id}-error`;

    return (
        <div className={adornment ? "relative" : undefined}>
            {/* the design uses placeholders as labels; keep a real one for
                assistive tech without changing the visual result */}
            <label htmlFor={id} className="sr-only">
                {label}
            </label>
            <input
                id={id}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined}
                className={
                    className ??
                    "w-full rounded-lg border border-field bg-transparent py-[14px] pl-3 focus:border-brand focus:outline-none sm:rounded-none sm:border-0 sm:border-b sm:border-content sm:py-[6px] sm:pl-[2px]"
                }
                {...inputProps}
            />
            {adornment}
            {error && (
                <p id={errorId} role="alert" className="pt-3 text-danger">
                    {error}
                </p>
            )}
        </div>
    );
};

export default FormField;
