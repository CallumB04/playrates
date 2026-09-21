import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import Field from "../ui/Field";
import { Input } from "../ui/Input";
import { cn } from "../../lib/cn";

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
    help?: ReactNode;
    /** Rendered inside the field wrapper, e.g. the show/hide password button. */
    adornment?: ReactNode;
}

/** An auth field, built from the same Field and Input as everything else. */
const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
    ({ label, error, help, adornment, className, ...inputProps }, ref) => (
        <Field label={label} error={error} help={help}>
            {(a11y) => (
                <div className={adornment ? "relative" : undefined}>
                    <Input
                        ref={ref}
                        className={cn(
                            adornment ? "pr-11" : undefined,
                            className
                        )}
                        {...a11y}
                        {...inputProps}
                    />
                    {adornment}
                </div>
            )}
        </Field>
    )
);

FormField.displayName = "FormField";

export default FormField;
