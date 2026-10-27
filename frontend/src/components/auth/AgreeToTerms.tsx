import { useId, type InputHTMLAttributes } from "react";

interface AgreeToTermsProps extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "type"
> {
    error?: string;
}

/** The age and terms agreement every account makes once, however it signed
 *  up. */
const AgreeToTerms = ({ error, ...inputProps }: AgreeToTermsProps) => {
    const errorId = useId();

    return (
        <div>
            <label className="flex min-h-11 cursor-pointer items-start gap-3 py-1 text-body-sm text-content-secondary">
                <input
                    type="checkbox"
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? errorId : undefined}
                    className="mt-0.5 size-4.5 shrink-0 accent-brand"
                    {...inputProps}
                />
                <span>
                    I’m 13 or older and I agree to the{" "}
                    {/* A new tab, so reading them doesn't lose what has
                        been typed here. */}
                    <a
                        href="/terms"
                        target="_blank"
                        rel="noopener"
                        className="text-content underline underline-offset-2 hover:text-brand"
                    >
                        Terms
                    </a>{" "}
                    and{" "}
                    <a
                        href="/privacy"
                        target="_blank"
                        rel="noopener"
                        className="text-content underline underline-offset-2 hover:text-brand"
                    >
                        Privacy Policy
                    </a>
                    .
                </span>
            </label>
            {error && (
                <p id={errorId} className="mt-1 text-label text-danger">
                    {error}
                </p>
            )}
        </div>
    );
};

export default AgreeToTerms;
