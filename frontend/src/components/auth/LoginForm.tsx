import { buttonClass } from "../ui/Button";
import { useState, type FormEvent } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useAccountForm } from "../../contexts/AccountFormContext";
import { useNotify } from "../../contexts/NotificationContext";
import FormField from "./FormField";
import PasswordField from "./PasswordField";
import LoadingSpinner from "../LoadingSpinner";

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
        <form onSubmit={handleSubmit} className="contents">
            <div className="mx-auto w-11/12 space-y-6 pt-12 sm:mx-0 sm:w-full sm:space-y-8">
                <FormField
                    label="Email"
                    name="email"
                    type="email"
                    placeholder="Email"
                    autoComplete="email"
                    defaultValue={initialEmail}
                    required
                    autoFocus
                />
                <PasswordField error={formError} />
            </div>

            <div className="mx-auto w-11/12 space-y-3 pt-6 sm:mx-0 sm:w-full sm:pt-8 md:pt-10">
                <button
                    type="submit"
                    className={buttonClass("primary", "w-full")}
                    disabled={isSubmitting}
                >
                    Log in
                </button>
            </div>

            {isSubmitting && (
                <div className="absolute inset-0 flex items-center justify-center bg-overlay-loading">
                    <LoadingSpinner size="lg" />
                </div>
            )}
        </form>
    );
};

export default LoginForm;
