import { useState, type FormEvent } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Button from "../ui/Button";
import FormField from "./FormField";

interface ForgotPasswordFormProps {
    /** Whatever was typed into the login form, so it isn't typed twice. */
    initialEmail?: string;
}

/**
 * Asks for an email and sends a link to set a new password. The reply is
 * the same whether or not the address has an account, so the form can't be
 * used to find out who's signed up.
 */
const ForgotPasswordForm = ({ initialEmail = "" }: ForgotPasswordFormProps) => {
    const { requestPasswordReset } = useAuth();
    const [sentTo, setSentTo] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string>();

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(undefined);
        setIsSubmitting(true);
        const email = String(
            new FormData(event.currentTarget).get("email") ?? ""
        );
        try {
            await requestPasswordReset(email);
            setSentTo(email);
        } catch {
            setError("That didn't send. Try again in a minute.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (sentTo) {
        return (
            <p
                role="status"
                className="text-body-sm leading-relaxed text-content-secondary"
            >
                If an account uses{" "}
                <span className="font-medium text-content">{sentTo}</span>, a
                link to set a new password is on its way. It can take a minute
                or two, and may land in spam.
            </p>
        );
    }

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
                error={error}
            />
            <Button type="submit" size="lg" disabled={isSubmitting}>
                {isSubmitting ? "Sending…" : "Send the link"}
            </Button>
        </form>
    );
};

export default ForgotPasswordForm;
