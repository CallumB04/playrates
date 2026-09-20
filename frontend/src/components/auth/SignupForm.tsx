import { buttonClass } from "../ui/Button";
import { useState, type FormEvent } from "react";
import { PasswordSchema, UsernameSchema } from "@playrates/shared";
import { checkUsernameAvailable } from "../../api";
import { useAuth } from "../../contexts/AuthContext";
import { useNotify } from "../../contexts/NotificationContext";
import FormField from "./FormField";
import PasswordField from "./PasswordField";
import LoadingSpinner from "../LoadingSpinner";

interface SignupFormProps {
    onSignedUp: (email: string) => void;
}

interface FieldErrors {
    username?: string;
    email?: string;
    password?: string;
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
        <form onSubmit={handleSubmit} className="contents">
            <div className="mx-auto w-11/12 space-y-6 pt-12 sm:mx-0 sm:w-full sm:space-y-8">
                <FormField
                    label="Username"
                    name="username"
                    type="text"
                    placeholder="Username"
                    autoComplete="username"
                    required
                    autoFocus
                    error={errors.username}
                />
                <FormField
                    label="Email"
                    name="email"
                    type="email"
                    placeholder="Email"
                    autoComplete="email"
                    required
                    error={errors.email}
                />
                <PasswordField error={errors.password} />
            </div>

            <div className="mx-auto w-11/12 space-y-3 pt-6 sm:mx-0 sm:w-full sm:pt-8 md:pt-10">
                <button
                    type="submit"
                    className={buttonClass("primary", "w-full sm:rounded-md")}
                    disabled={isSubmitting}
                >
                    Sign up
                </button>
            </div>

            {isSubmitting && (
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-overlay-loading">
                    <LoadingSpinner size="lg" />
                </div>
            )}
        </form>
    );
};

export default SignupForm;
