import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { PasswordSchema } from "@playrates/shared";
import { useAuth } from "../contexts/AuthContext";
import { useAccountForm } from "../contexts/AccountFormContext";
import { usePageMeta } from "../hooks/usePageMeta";
import Button from "../components/ui/Button";
import { cardClass } from "../components/ui/Card";
import EmptyPlate from "../components/ui/EmptyPlate";
import { TextSkeleton } from "../components/ui/Skeleton";
import PasswordField from "../components/auth/PasswordField";

/**
 * Where a reset link lands. The link signs you in for just this, so with no
 * session the link has expired or been used, and the way on is a new one.
 */
const ResetPasswordPage = () => {
    usePageMeta({ title: "Set a new password", noindex: true });
    const { session, isLoading, updatePassword } = useAuth();
    const { openReset } = useAccountForm();
    const navigate = useNavigate();
    const [error, setError] = useState<string>();
    const [confirmError, setConfirmError] = useState<string>();
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (isLoading) return <TextSkeleton lines={4} />;

    if (!session) {
        return (
            <EmptyPlate
                title="That link has expired"
                body="That link has expired. Send yourself a new one."
                action={<Button onClick={openReset}>Send a new link</Button>}
            />
        );
    }

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const password = String(data.get("password") ?? "");
        const confirmPassword = String(data.get("confirmPassword") ?? "");
        const checked = PasswordSchema.safeParse(password);
        if (!checked.success) {
            setError(checked.error.issues[0]?.message);
            setConfirmError(undefined);
            return;
        }
        setError(undefined);
        if (confirmPassword !== password) {
            setConfirmError("The passwords don't match.");
            return;
        }
        setConfirmError(undefined);
        setIsSubmitting(true);
        try {
            await updatePassword(password);
            navigate("/", { replace: true });
        } catch {
            setError("That didn't save. Try again, or ask for a new link.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="mx-auto flex w-full max-w-[440px] flex-col gap-5">
            <h1 className="font-display text-title text-content">
                Set a new password
            </h1>
            <form
                onSubmit={(event) => void handleSubmit(event)}
                className={cardClass("flex flex-col gap-4")}
            >
                <PasswordField
                    label="New password"
                    autoComplete="new-password"
                    autoFocus
                    error={error}
                />
                <PasswordField
                    label="Confirm new password"
                    name="confirmPassword"
                    autoComplete="new-password"
                    error={confirmError}
                />
                <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? "Saving…" : "Save new password"}
                </Button>
            </form>
        </div>
    );
};

export default ResetPasswordPage;
