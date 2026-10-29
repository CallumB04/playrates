import { useEffect, useId, useState, type FormEvent } from "react";
import { EmailSchema } from "@playrates/shared";
import { useAuth } from "../../contexts/AuthContext";
import { useNotify } from "../../contexts/NotificationContext";
import Button from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { cn } from "../../lib/cn";
import { emailChangeError } from "./accountErrors";

/**
 * The sign-in email, changed in place like the username. Where the project
 * wants a change confirmed, nothing moves until the link in the new inbox is
 * followed, so the field keeps the old address and says where the link went.
 */
const EmailRow = () => {
    const { session, changeEmail } = useAuth();
    const notify = useNotify();
    const current = session?.user.email ?? "";

    const [value, setValue] = useState(current);
    const [error, setError] = useState<string>();
    const [saving, setSaving] = useState(false);
    // Supabase keeps the pending address on the user, so it survives a
    // reload; this covers the moment before the session catches up.
    const [sentTo, setSentTo] = useState<string>();
    const pending = session?.user.new_email ?? sentTo;
    const messageId = useId();

    useEffect(() => {
        setValue(current);
    }, [current]);

    const changed = value.trim().toLowerCase() !== current;

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const parsed = EmailSchema.safeParse(value);
        if (!parsed.success) {
            setError("Enter an email address, like you@example.com.");
            return;
        }
        setError(undefined);
        setSaving(true);
        try {
            const result = await changeEmail(parsed.data);
            if (result.pending) {
                setSentTo(parsed.data);
                setValue(current);
                notify(`Check ${parsed.data} to confirm it`, "success");
            } else {
                notify("Email changed", "success");
            }
        } catch (err) {
            setError(emailChangeError(err));
        } finally {
            setSaving(false);
        }
    };

    return (
        <form
            noValidate
            onSubmit={(event) => void submit(event)}
            className="flex flex-col gap-2"
        >
            <div className="flex gap-2">
                <Input
                    type="email"
                    autoComplete="email"
                    aria-label="Email"
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error || pending ? messageId : undefined}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="min-w-0 flex-1"
                />
                <Button
                    type="submit"
                    aria-label="Change email"
                    disabled={!changed || saving}
                >
                    {saving ? "Saving…" : "Change"}
                </Button>
            </div>
            {(error || pending) && (
                <p
                    id={messageId}
                    role={error ? "alert" : undefined}
                    className={cn(
                        "text-xs",
                        error ? "text-danger" : "text-content-muted"
                    )}
                >
                    {error ??
                        `We've sent a link to ${pending}. Your email changes once you follow it.`}
                </p>
            )}
        </form>
    );
};

export default EmailRow;
