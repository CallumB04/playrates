import { useState, type FormEvent } from "react";
import { PasswordSchema } from "@playrates/shared";
import { useAuth } from "../../contexts/AuthContext";
import { useNotify } from "../../contexts/NotificationContext";
import Button from "../../components/ui/Button";
import PasswordField from "../../components/auth/PasswordField";
import { useCaptcha } from "../../components/auth/useCaptcha";
import { passwordChangeError, passwordlessProvider } from "./accountErrors";

interface Errors {
    current?: string;
    next?: string;
    confirm?: string;
}

/**
 * A button until it's wanted, then the three fields. The current password
 * is checked by signing in with it, which is what the bot check guards.
 */
const PasswordRow = () => {
    const { session, changePassword } = useAuth();
    const notify = useNotify();
    const captcha = useCaptcha();
    const [open, setOpen] = useState(false);
    const [errors, setErrors] = useState<Errors>({});
    const [saving, setSaving] = useState(false);

    const provider = passwordlessProvider(session?.user);
    if (provider) {
        return (
            <p className="text-body-sm text-content-secondary">
                You sign in with {provider}, so there’s no password to change.
            </p>
        );
    }

    if (!open) {
        return (
            <Button
                variant="secondary"
                className="w-full sm:w-auto"
                onClick={() => setOpen(true)}
            >
                Change password
            </Button>
        );
    }

    const close = () => {
        setErrors({});
        setOpen(false);
    };

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const current = String(data.get("currentPassword") ?? "");
        const next = String(data.get("newPassword") ?? "");
        const confirm = String(data.get("confirmPassword") ?? "");

        const found: Errors = {};
        if (!current) found.current = "Enter your current password.";
        const checked = PasswordSchema.safeParse(next);
        if (!checked.success) {
            found.next = checked.error.issues[0]?.message;
        } else if (next === current) {
            found.next = "That's your current password. Choose a new one.";
        } else if (confirm !== next) {
            found.confirm = "The passwords don't match.";
        }
        setErrors(found);
        if (Object.keys(found).length > 0) return;

        setSaving(true);
        const captchaToken = await captcha.getToken();
        if (captchaToken === null) {
            setSaving(false);
            return;
        }
        try {
            await changePassword(current, next, captchaToken);
            notify("Password changed", "success");
            close();
        } catch (err) {
            if (captcha.handled(err)) return;
            const { field, message } = passwordChangeError(err);
            if (field === "form") notify(message, "error");
            else setErrors({ [field]: message });
        } finally {
            captcha.reset();
            setSaving(false);
        }
    };

    return (
        <form
            noValidate
            onSubmit={(event) => void submit(event)}
            className="flex flex-col gap-4"
        >
            {/* Tells a password manager which login it is updating. */}
            <input
                type="email"
                name="username"
                autoComplete="username"
                value={session?.user.email ?? ""}
                readOnly
                hidden
            />
            <PasswordField
                label="Current password"
                name="currentPassword"
                autoComplete="current-password"
                autoFocus
                error={errors.current}
            />
            <PasswordField
                label="New password"
                name="newPassword"
                autoComplete="new-password"
                placeholder="At least 8 characters"
                error={errors.next}
            />
            <PasswordField
                label="Confirm new password"
                name="confirmPassword"
                autoComplete="new-password"
                error={errors.confirm}
            />
            {captcha.field}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                    variant="secondary"
                    className="w-full sm:w-auto"
                    onClick={close}
                    disabled={saving}
                >
                    Cancel
                </Button>
                <Button
                    type="submit"
                    className="w-full sm:w-auto"
                    disabled={saving}
                >
                    {saving ? "Saving…" : "Save new password"}
                </Button>
            </div>
        </form>
    );
};

export default PasswordRow;
