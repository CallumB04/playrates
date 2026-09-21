import { useId, type ReactNode } from "react";
import { cn } from "../../lib/cn";

interface FieldA11y {
    id: string;
    "aria-describedby"?: string;
    "aria-invalid"?: true;
}

interface FieldProps {
    label: string;
    /** Keeps the label for assistive tech but takes it off the page. */
    labelHidden?: boolean;
    help?: ReactNode;
    error?: string;
    /** Receives the wiring to spread onto the control. */
    children: (a11y: FieldA11y) => ReactNode;
    className?: string;
}

/**
 * Label, help and error, with the label colour keyed to state. A render prop
 * rather than cloneElement, so the a11y wiring is typed and visible at the
 * call site.
 */
const Field = ({
    label,
    labelHidden = false,
    help,
    error,
    children,
    className,
}: FieldProps) => {
    const id = useId();
    const messageId = `${id}-message`;
    const message = error ?? help;

    return (
        <div className={cn("group flex flex-col", className)}>
            <label
                htmlFor={id}
                className={cn(
                    "mb-2 text-label-sm",
                    labelHidden && "sr-only",
                    error
                        ? "text-danger"
                        : "text-content-muted group-focus-within:text-brand"
                )}
            >
                {label}
            </label>

            {children({
                id,
                "aria-describedby": message ? messageId : undefined,
                "aria-invalid": error ? true : undefined,
            })}

            {message && (
                <p
                    id={messageId}
                    role={error ? "alert" : undefined}
                    className={cn(
                        "mt-1.5 text-xs leading-snug",
                        error ? "text-danger" : "text-content-muted"
                    )}
                >
                    {message}
                </p>
            )}
        </div>
    );
};

export default Field;
