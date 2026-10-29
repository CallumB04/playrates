import { useEffect, useState } from "react";
import { ExternalLink, MailCheck } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useNotify } from "../../contexts/NotificationContext";
import { inboxFor } from "../../lib/authLinks";
import { buttonClass } from "../ui/Button";
import Button from "../ui/Button";
import { useCaptcha } from "./useCaptcha";

/** Supabase won't send another inside a minute (auth.email.max_frequency). */
export const RESEND_WAIT_S = 60;

interface CheckInboxProps {
    email: string;
    /** Straight after signing up a link is already on its way; from log-in,
     *  it may not be, so the resend is offered at once. */
    justSent: boolean;
    /** Back to sign-up, for an address typed wrong. */
    onStartAgain: () => void;
}

/**
 * Where sign-up ends while the email is unconfirmed: which address the link
 * went to, a way into that inbox, and another link if the first is slow.
 */
const CheckInbox = ({ email, justSent, onStartAgain }: CheckInboxProps) => {
    const { resendConfirmation } = useAuth();
    const notify = useNotify();
    const captcha = useCaptcha();
    const [wait, setWait] = useState(justSent ? RESEND_WAIT_S : 0);
    const [sending, setSending] = useState(false);
    const inbox = inboxFor(email);

    useEffect(() => {
        if (wait <= 0) return;
        const tick = window.setTimeout(() => setWait((w) => w - 1), 1000);
        return () => window.clearTimeout(tick);
    }, [wait]);

    const resend = async () => {
        setSending(true);
        const captchaToken = await captcha.getToken();
        if (captchaToken === null) {
            setSending(false);
            return;
        }
        try {
            await resendConfirmation(email, captchaToken);
            notify("Sent. Check your inbox", "success");
            setWait(RESEND_WAIT_S);
        } catch (error) {
            captcha.reset();
            if (captcha.handled(error)) return;
            notify("Couldn't send it. Try again in a minute.", "error");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="flex flex-col items-center text-center">
            <span className="grid size-14 place-items-center rounded-lg bg-brand-subtle text-brand">
                <MailCheck size={26} aria-hidden />
            </span>
            <p className="mt-4 text-body-sm text-content-secondary">
                {justSent
                    ? "We've sent a link to"
                    : "To log in, confirm your email with the link we sent to"}
            </p>
            <p className="mt-0.5 font-semibold break-all text-content">
                {email}
            </p>
            <button
                type="button"
                onClick={onStartAgain}
                className="relative mt-1 cursor-pointer text-label text-brand before:absolute before:-inset-x-2 before:-inset-y-3 before:content-[''] hover:underline"
            >
                Wrong address? Change it
            </button>

            {captcha.field}

            <div className="mt-6 flex w-full flex-col gap-2">
                {inbox && (
                    <a
                        href={inbox.href}
                        target="_blank"
                        rel="noreferrer noopener"
                        className={buttonClass("primary", "w-full gap-2", "lg")}
                    >
                        {inbox.label}
                        <ExternalLink size={15} aria-hidden />
                    </a>
                )}
                <Button
                    variant={inbox ? "secondary" : "primary"}
                    size="lg"
                    onClick={() => void resend()}
                    disabled={wait > 0 || sending}
                    className="w-full"
                >
                    {sending
                        ? "Sending…"
                        : wait > 0
                          ? `Send another in ${wait}s`
                          : "Send another link"}
                </Button>
            </div>

            <p className="mt-4 text-label text-content-muted">
                Not there? Give it a minute, or check spam.
            </p>
        </div>
    );
};

export default CheckInbox;
