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

/**
 * An auth field, built from the same Field and Input the rest of the app
 * uses.
 *
 * This used to draw its own control: a bottom-rule on desktop, a boxed one on
 * mobile, with the placeholder standing in for the label. That made the two
 * most important forms on the site the only ones that did not look like it,
 * and left the label invisible the moment anyone typed.
 */
const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
    ({ label, error, help, adornment, className, ...inputProps }, ref) => (
        <Field label={label} error={error} help={help}>
            {(a11y) => (
                <div className={adornment ? "relative" : undefined}>
                    <Input
                        ref={ref}
                        className={cn(adornment ? "pr-11" : undefined, className)}
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
