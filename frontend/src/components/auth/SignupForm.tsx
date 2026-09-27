import Button from "../ui/Button";
import { useState, type FormEvent } from "react";
import { PasswordSchema, UsernameSchema } from "@playrates/shared";
import { checkUsernameAvailable } from "../../api";
import { useAuth } from "../../contexts/AuthContext";
import { useNotify } from "../../contexts/NotificationContext";
import FormField from "./FormField";
import PasswordField from "./PasswordField";

interface SignupFormProps {
    onSignedUp: (email: string) => void;
}

interface FieldErrors {
    username?: string;
    email?: string;
    password?: string;
    agree?: string;
}

const SignupForm = ({ onSignedUp }: SignupFormProps) => {
    const { signUp } = useAuth();
    const notify = useNotify();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<FieldErrors>({});

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsSubmitting(true);

        const data = new FormData(event.currentTarget);
        const username = String(data.get("username") ?? "");
        const email = String(data.get("email") ?? "").toLowerCase();
        const password = String(data.get("password") ?? "");
        const agreed = data.get("agree") === "on";

        // the same schemas the backend validates with, so the rules cannot drift
        const next: FieldErrors = {};

        const usernameResult = UsernameSchema.safeParse(username);
        if (!usernameResult.success) {
            next.username = usernameResult.error.issues[0]?.message;
        }

        const passwordResult = PasswordSchema.safeParse(password);
        if (!passwordResult.success) {
            next.password = passwordResult.error.issues[0]?.message;
        }

        if (!agreed) {
            next.agree =
                "You need to be 13 or older and agree to the terms to join.";
        }

        if (!next.username) {
            const available = await checkUsernameAvailable(username);
            if (!available) next.username = "Sorry, that username is taken.";
        }

        if (Object.keys(next).length > 0) {
            setErrors(next);
            setIsSubmitting(false);
            return;
        }

        setErrors({});

        try {
            await signUp(email, password, username);
            notify("Account successfully created", "success");
            onSignedUp(email);
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Please try again.";
            // Supabase reports a duplicate email rather than us probing for it
            // with a public lookup endpoint
            setErrors({ email: message });
            notify("Account creation failed", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <FormField
                label="Username"
                name="username"
                type="text"
                placeholder="yourname"
                help="This is your profile's address."
                autoComplete="username"
                required
                autoFocus
                error={errors.username}
            />
            <FormField
                label="Email"
                name="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                required
                error={errors.email}
            />
            <PasswordField
                autoComplete="new-password"
                help="At least 8 characters."
                error={errors.password}
            />

            <div>
                <label className="flex min-h-11 cursor-pointer items-start gap-3 py-1 text-body-sm text-content-secondary">
                    <input
                        type="checkbox"
                        name="agree"
                        aria-invalid={errors.agree ? true : undefined}
                        aria-describedby={
                            errors.agree ? "signup-agree-error" : undefined
                        }
                        className="mt-0.5 size-4.5 shrink-0 accent-brand"
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
                {errors.agree && (
                    <p
                        id="signup-agree-error"
                        className="mt-1 text-label text-danger"
                    >
                        {errors.agree}
                    </p>
                )}
            </div>

            <Button type="submit" size="lg" disabled={isSubmitting}>
                {isSubmitting ? "Creating your account…" : "Create account"}
            </Button>
        </form>
    );
};

export default SignupForm;
