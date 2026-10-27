import Button from "../ui/Button";
import { useState, type FormEvent } from "react";
import { PasswordSchema, UsernameSchema } from "@playrates/shared";
import { checkUsernameAvailable } from "../../api";
import { useAuth } from "../../contexts/AuthContext";
import { useNotify } from "../../contexts/NotificationContext";
import FormField from "./FormField";
import OAuthButtons from "./OAuthButtons";
import PasswordField from "./PasswordField";
import AgreeToTerms from "./AgreeToTerms";
import { useCaptcha } from "./useCaptcha";

interface SignupFormProps {
    onSignedUp: (email: string) => void;
}

interface FieldErrors {
    username?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    agree?: string;
}

const SignupForm = ({ onSignedUp }: SignupFormProps) => {
    const { signUp } = useAuth();
    const notify = useNotify();
    const captcha = useCaptcha();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<FieldErrors>({});

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsSubmitting(true);

        const data = new FormData(event.currentTarget);
        const username = String(data.get("username") ?? "");
        const email = String(data.get("email") ?? "").toLowerCase();
        const password = String(data.get("password") ?? "");
        const confirmPassword = String(data.get("confirmPassword") ?? "");
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
        } else if (confirmPassword !== password) {
            next.confirmPassword = "The passwords don't match.";
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
        if (!captcha.ready()) {
            setIsSubmitting(false);
            return;
        }

        try {
            await signUp(email, password, username, captcha.token);
            notify("Account successfully created", "success");
            onSignedUp(email);
        } catch (error) {
            captcha.reset();
            if (captcha.handled(error)) return;
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
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <OAuthButtons />
            <FormField
                label="Username"
                name="username"
                type="text"
                placeholder="yourname"
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
                placeholder="At least 8 characters"
                error={errors.password}
            />
            <PasswordField
                label="Confirm password"
                name="confirmPassword"
                autoComplete="new-password"
                error={errors.confirmPassword}
            />

            <AgreeToTerms name="agree" error={errors.agree} />
            {captcha.field}

            <Button type="submit" size="lg" disabled={isSubmitting}>
                {isSubmitting ? "Creating your account…" : "Create account"}
            </Button>
        </form>
    );
};

export default SignupForm;
