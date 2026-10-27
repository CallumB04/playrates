import { useRef, useState, type ReactNode } from "react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { isAuthError } from "@supabase/supabase-js";
import { env } from "../../lib/env";
import { useTheme } from "../../contexts/ThemeContext";

/** How long a submit waits on a check still running before giving up. */
const WAIT_MS = 20_000;

export interface Captcha {
    /** The challenge, if one is needed, and anything it has to say. */
    field: ReactNode;
    /**
     * The token to send, waiting for the check if it's still running.
     * Undefined with no site key configured; null when there is none to be
     * had, having said why in the field.
     */
    getToken: () => Promise<string | undefined | null>;
    /** True, and says so in the field, when the request failed on the check. */
    handled: (error: unknown) => boolean;
    /** A token is good for one request, so call this after every attempt. */
    reset: () => void;
}

/**
 * Cloudflare Turnstile, for Supabase's bot protection on the email forms.
 * Invisible unless Cloudflare wants an interaction, so most people never see
 * it. With no site key configured nothing renders and requests go without a
 * token, which is right only where Supabase isn't asking for one.
 */
export const useCaptcha = (): Captcha => {
    const { theme } = useTheme();
    const widget = useRef<TurnstileInstance>();
    // Refs, not state: a submit handler waits on these across renders.
    const token = useRef<string>();
    const failed = useRef(false);
    const waiting = useRef<((token: string | null) => void)[]>([]);
    const [message, setMessage] = useState<string>();
    const siteKey = env.turnstileSiteKey;

    if (!siteKey) {
        return {
            field: null,
            getToken: async () => undefined,
            handled: () => false,
            reset: () => {},
        };
    }

    const settle = (next: string | null) => {
        const waiters = waiting.current;
        waiting.current = [];
        for (const resolve of waiters) resolve(next);
    };

    const unavailable = () => {
        setMessage(
            "The bot check didn't finish. Refresh the page and try again."
        );
        return null;
    };

    return {
        field: (
            <div>
                <Turnstile
                    ref={widget}
                    siteKey={siteKey}
                    options={{
                        theme,
                        size: "flexible",
                        appearance: "interaction-only",
                    }}
                    onSuccess={(next) => {
                        token.current = next;
                        failed.current = false;
                        setMessage(undefined);
                        settle(next);
                    }}
                    onExpire={() => {
                        token.current = undefined;
                    }}
                    onError={() => {
                        token.current = undefined;
                        failed.current = true;
                        settle(null);
                    }}
                />
                {message && (
                    <p role="alert" className="mt-1 text-label text-danger">
                        {message}
                    </p>
                )}
            </div>
        ),
        /* Pressing the button before the check has finished, a second or two
           after the sheet opens, used to be told to try again. Now the
           request waits for it instead. */
        getToken: async () => {
            if (token.current) return token.current;
            if (failed.current) return unavailable();
            const next = await new Promise<string | null>((resolve) => {
                waiting.current.push(resolve);
                setTimeout(() => resolve(null), WAIT_MS);
            });
            return next ?? unavailable();
        },
        handled: (error) => {
            if (!isAuthError(error) || error.code !== "captcha_failed") {
                return false;
            }
            setMessage("The bot check didn't pass. Please try again.");
            return true;
        },
        reset: () => {
            token.current = undefined;
            widget.current?.reset();
        },
    };
};
