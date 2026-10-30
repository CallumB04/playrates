import { useState, type FormEvent } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useAccountForm } from "../../contexts/AccountFormContext";
import { useNotify } from "../../contexts/NotificationContext";
import Button from "../ui/Button";
import FormField from "./FormField";
import OAuthButtons from "./OAuthButtons";
import PasswordField from "./PasswordField";
import { useCaptcha } from "./useCaptcha";

const isUnconfirmed = (error: unknown) =>
    error instanceof Error &&
    ((error as { code?: string }).code === "email_not_confirmed" ||
        /email not confirmed/i.test(error.message));

interface LoginFormProps {
    /** Carried over when the user has just signed up. */
    initialEmail?: string;
    /** Opens the forgotten-password form with whatever email was typed. */
    onForgot?: (email: string) => void;
    /** The details were right but the email isn't confirmed yet. */
    onUnconfirmed?: (email: string) => void;
}

const LoginForm = ({
    initialEmail = "",
    onForgot,
    onUnconfirmed,
}: LoginFormProps) => {
    const { signIn } = useAuth();
    const { close } = useAccountForm();
    const notify = useNotify();
    const captcha = useCaptcha();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState<string>();

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setFormError(undefined);
        setIsSubmitting(true);

        const data = new FormData(event.currentTarget);
        const email = String(data.get("email") ?? "");
        const password = String(data.get("password") ?? "");

        const captchaToken = await captcha.getToken();
        if (captchaToken === null) {
            setIsSubmitting(false);
            return;
        }

        try {
            // Supabase verifies the password. It never reaches this client,
            // and no user record is downloaded to compare it against.
            await signIn(email, password, captchaToken);
            close();
        } catch (error) {
            captcha.reset();
            if (captcha.handled(error)) return;
            // Not a wrong password: the link to confirm hasn't been opened.
            if (isUnconfirmed(error) && onUnconfirmed)
                return onUnconfirmed(email);
            setFormError(
                error instanceof Error
                    ? "Those login details are not correct."
                    : "Couldn’t log you in. Try again."
            );
            notify("Login failed", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <OAuthButtons />
            <FormField
                label="Email"
                name="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                defaultValue={initialEmail}
                required
                autoFocus
            />
            <div className="flex flex-col gap-1.5">
                <PasswordField error={formError} />
                {/* Where every login form keeps it: someone who's forgotten
                    looks right under the password. */}
                {onForgot && (
                    <button
                        type="button"
                        onClick={(event) => {
                            const email =
                                event.currentTarget.form?.elements.namedItem(
                                    "email"
                                ) as HTMLInputElement | null;
                            onForgot(email?.value ?? "");
                        }}
                        className="relative cursor-pointer self-end text-label text-brand before:absolute before:-inset-3 before:content-[''] hover:underline sm:before:hidden"
                    >
                        Forgot password?
                    </button>
                )}
            </div>

            {captcha.field}

            {/* The button carries the pending state rather than a spinner
                covering the panel, which hid the fields you were correcting. */}
            <Button type="submit" size="lg" disabled={isSubmitting}>
                {isSubmitting ? "Logging in…" : "Log in"}
            </Button>
        </form>
    );
};

export default LoginForm;
