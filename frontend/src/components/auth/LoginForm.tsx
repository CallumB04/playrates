import { useState, type FormEvent } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useAccountForm } from "../../contexts/AccountFormContext";
import { useNotify } from "../../contexts/NotificationContext";
import Button from "../ui/Button";
import FormField from "./FormField";
import PasswordField from "./PasswordField";

interface LoginFormProps {
    /** Carried over when the user has just signed up. */
    initialEmail?: string;
}

const LoginForm = ({ initialEmail = "" }: LoginFormProps) => {
    const { signIn } = useAuth();
    const { close } = useAccountForm();
    const notify = useNotify();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState<string>();

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setFormError(undefined);
        setIsSubmitting(true);

        const data = new FormData(event.currentTarget);
        const email = String(data.get("email") ?? "");
        const password = String(data.get("password") ?? "");

        try {
            // Supabase verifies the password. It never reaches this client,
            // and no user record is downloaded to compare it against.
            await signIn(email, password);
            close();
        } catch (error) {
            setFormError(
                error instanceof Error
                    ? "Those login details are not correct."
                    : "Something went wrong. Please try again."
            );
            notify("Login failed", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
            <PasswordField error={formError} />

            {/* The button carries the pending state rather than a spinner
                covering the panel, which hid the fields you were correcting. */}
            <Button type="submit" size="lg" disabled={isSubmitting}>
                {isSubmitting ? "Logging in…" : "Log in"}
            </Button>
        </form>
    );
};

export default LoginForm;
