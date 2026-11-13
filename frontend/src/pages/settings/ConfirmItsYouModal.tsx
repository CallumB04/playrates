import { useId, useState, type FormEvent } from "react";
import { isAuthError } from "@supabase/auth-js";
import Popup from "../../components/ui/Popup";
import Button from "../../components/ui/Button";
import PasswordField from "../../components/auth/PasswordField";
import { useCaptcha } from "../../components/auth/useCaptcha";
import { useAuth, type OAuthProvider } from "../../contexts/AuthContext";
import { passwordlessProvider } from "./accountErrors";

export type ConfirmPurpose = "delete" | "export";

const DOING: Record<ConfirmPurpose, string> = {
    delete: "delete your account",
    export: "export your data",
};

const PROVIDER_IDS: Record<string, OAuthProvider> = {
    Google: "google",
    Discord: "discord",
};

interface ConfirmItsYouModalProps {
    purpose: ConfirmPurpose;
    /** Where a provider sign-in comes back to, to carry on from there. */
    returnTo: string;
    onConfirmed: () => void;
    onCancel: () => void;
}

/**
 * A sign-in from moments ago, for what can't be undone or hands over
 * everything. The API refuses those on a token alone, since one lifted from
 * a device stays good for an hour.
 */
const ConfirmItsYouModal = ({
    purpose,
    returnTo,
    onConfirmed,
    onCancel,
}: ConfirmItsYouModalProps) => {
    const { session, confirmPassword, signInWithProvider } = useAuth();
    const captcha = useCaptcha();
    const [error, setError] = useState<string>();
    const [busy, setBusy] = useState(false);
    const formId = useId();
    const provider = passwordlessProvider(session?.user);

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const password = String(
            new FormData(event.currentTarget).get("password") ?? ""
        );
        if (!password) {
            setError("Enter your password.");
            return;
        }
        setBusy(true);
        const captchaToken = await captcha.getToken();
        if (captchaToken === null) {
            setBusy(false);
            return;
        }
        try {
            await confirmPassword(password, captchaToken);
            onConfirmed();
        } catch (err) {
            if (captcha.handled(err)) return;
            setError(
                isAuthError(err) && err.code === "invalid_credentials"
                    ? "That isn’t your password."
                    : "Couldn’t check your password. Try again."
            );
        } finally {
            captcha.reset();
            setBusy(false);
        }
    };

    const leave = async () => {
        if (!provider) return;
        setBusy(true);
        try {
            await signInWithProvider(
                PROVIDER_IDS[provider] ?? (provider as OAuthProvider),
                returnTo
            );
            // Success is the page navigating away, so the button stays busy.
        } catch {
            setBusy(false);
            setError("Couldn’t reach the log-in page. Try again.");
        }
    };

    return (
        <Popup
            onClose={onCancel}
            titleId="confirm-its-you-title"
            width="w-full sm:max-w-md"
            title="Confirm it’s you"
            blurb={
                <p>
                    {provider
                        ? `Log in with ${provider} again to ${DOING[purpose]}.`
                        : `Enter your password to ${DOING[purpose]}.`}
                </p>
            }
            footer={
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button
                        variant="secondary"
                        className="w-full sm:w-auto"
                        onClick={onCancel}
                        disabled={busy}
                    >
                        Cancel
                    </Button>
                    {provider ? (
                        <Button
                            className="w-full sm:w-auto"
                            onClick={() => void leave()}
                            disabled={busy}
                        >
                            Continue with {provider}
                        </Button>
                    ) : (
                        <Button
                            type="submit"
                            form={formId}
                            className="w-full sm:w-auto"
                            disabled={busy}
                        >
                            {busy ? "Checking…" : "Confirm"}
                        </Button>
                    )}
                </div>
            }
        >
            {provider ? (
                error && (
                    <p role="alert" className="text-body-sm text-danger">
                        {error}
                    </p>
                )
            ) : (
                <form
                    id={formId}
                    noValidate
                    onSubmit={(event) => void submit(event)}
                    className="flex flex-col gap-4"
                >
                    {/* Tells a password manager which login this is. */}
                    <input
                        type="email"
                        name="username"
                        autoComplete="username"
                        value={session?.user.email ?? ""}
                        readOnly
                        hidden
                    />
                    <PasswordField
                        label="Password"
                        name="password"
                        autoComplete="current-password"
                        autoFocus
                        error={error}
                    />
                    {captcha.field}
                </form>
            )}
        </Popup>
    );
};

export default ConfirmItsYouModal;
