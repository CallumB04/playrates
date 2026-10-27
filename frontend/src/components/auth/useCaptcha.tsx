import { useRef, useState, type ReactNode } from "react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { isAuthError } from "@supabase/supabase-js";
import { env } from "../../lib/env";
import { useTheme } from "../../contexts/ThemeContext";

export interface Captcha {
    /** The challenge, if one is needed, and anything it has to say. */
    field: ReactNode;
    /** Pass to the request. Undefined with no site key configured. */
    token: string | undefined;
    /** Whether the form can send now. Says why not, in the field, if not. */
    ready: () => boolean;
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
    const [token, setToken] = useState<string>();
    const [failed, setFailed] = useState(false);
    const [message, setMessage] = useState<string>();
    const siteKey = env.turnstileSiteKey;

    if (!siteKey) {
        return {
            field: null,
            token: undefined,
            ready: () => true,
            handled: () => false,
            reset: () => {},
        };
    }

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
                        setToken(next);
                        setFailed(false);
                        setMessage(undefined);
                    }}
                    onExpire={() => setToken(undefined)}
                    onError={() => {
                        setToken(undefined);
                        setFailed(true);
                    }}
                />
                {message && (
                    <p role="alert" className="mt-1 text-label text-danger">
                        {message}
                    </p>
                )}
            </div>
        ),
        token,
        ready: () => {
            if (token) return true;
            setMessage(
                failed
                    ? "The bot check didn't load. Refresh the page and try again."
                    : "Still checking you're not a bot. Try again in a moment."
            );
            return false;
        },
        handled: (error) => {
            if (!isAuthError(error) || error.code !== "captcha_failed") {
                return false;
            }
            setMessage("The bot check didn't pass. Please try again.");
            return true;
        },
        reset: () => {
            setToken(undefined);
            widget.current?.reset();
        },
    };
};
