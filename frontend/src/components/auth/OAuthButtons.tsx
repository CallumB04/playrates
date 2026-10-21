import { useState, type ComponentType } from "react";
import { useAuth, type OAuthProvider } from "../../contexts/AuthContext";
import { useNotify } from "../../contexts/NotificationContext";
import Button from "../ui/Button";

/* Brand marks keep their own colours rather than the theme's: Google's
   guidelines ask for the four-colour G, and both are recognised by shape and
   colour together. */
const GoogleMark = () => (
    <svg viewBox="0 0 48 48" aria-hidden className="size-5 shrink-0">
        <path
            fill="#FFC107"
            d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"
        />
        <path
            fill="#FF3D00"
            d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
        />
        <path
            fill="#4CAF50"
            d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
        />
        <path
            fill="#1976D2"
            d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"
        />
    </svg>
);

const DiscordMark = () => (
    <svg viewBox="0 0 24 24" aria-hidden className="size-5 shrink-0">
        <path
            fill="#5865F2"
            d="M20.32 4.37a19.8 19.8 0 0 0-4.89-1.52.07.07 0 0 0-.08.04c-.21.38-.44.87-.61 1.25a18.27 18.27 0 0 0-5.49 0 12.64 12.64 0 0 0-.62-1.25.08.08 0 0 0-.08-.04 19.74 19.74 0 0 0-4.88 1.52.07.07 0 0 0-.03.03C.53 9.05-.32 13.58.1 18.06a.08.08 0 0 0 .03.06 19.9 19.9 0 0 0 5.99 3.03.08.08 0 0 0 .09-.03c.46-.63.87-1.3 1.22-1.99a.08.08 0 0 0-.04-.11 13.1 13.1 0 0 1-1.87-.89.08.08 0 0 1-.01-.13l.37-.29a.07.07 0 0 1 .08-.01c3.93 1.79 8.18 1.79 12.06 0a.07.07 0 0 1 .08.01l.37.29a.08.08 0 0 1-.01.13c-.6.35-1.22.65-1.87.89a.08.08 0 0 0-.04.11c.36.7.77 1.36 1.22 1.99a.08.08 0 0 0 .09.03 19.84 19.84 0 0 0 6-3.03.08.08 0 0 0 .03-.06c.5-5.18-.84-9.67-3.55-13.66a.06.06 0 0 0-.03-.03zM8.02 15.33c-1.18 0-2.16-1.09-2.16-2.42s.96-2.42 2.16-2.42c1.21 0 2.18 1.1 2.16 2.42 0 1.33-.96 2.42-2.16 2.42zm7.97 0c-1.18 0-2.15-1.09-2.15-2.42s.95-2.42 2.15-2.42c1.21 0 2.18 1.1 2.16 2.42 0 1.33-.95 2.42-2.16 2.42z"
        />
    </svg>
);

const PROVIDERS: { id: OAuthProvider; label: string; Mark: ComponentType }[] = [
    { id: "google", label: "Google", Mark: GoogleMark },
    { id: "discord", label: "Discord", Mark: DiscordMark },
];

/** Above the email form, since it's the shorter way in. */
const OAuthButtons = () => {
    const { signInWithProvider } = useAuth();
    const notify = useNotify();
    const [leavingFor, setLeavingFor] = useState<OAuthProvider | null>(null);

    const go = async (provider: OAuthProvider) => {
        setLeavingFor(provider);
        try {
            await signInWithProvider(provider);
            // Success is the page navigating away, so the button stays busy.
        } catch {
            setLeavingFor(null);
            notify(
                "Couldn't reach the sign-in page. Please try again.",
                "error"
            );
        }
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
                {PROVIDERS.map(({ id, label, Mark }) => (
                    <Button
                        key={id}
                        type="button"
                        variant="secondary"
                        size="lg"
                        onClick={() => void go(id)}
                        disabled={leavingFor !== null}
                    >
                        <Mark />
                        {leavingFor === id
                            ? `Opening ${label}…`
                            : `Continue with ${label}`}
                    </Button>
                ))}
            </div>
            <div
                role="separator"
                className="flex items-center gap-3 text-label-sm text-content-muted"
            >
                <span className="h-px flex-1 bg-subtle" />
                or with email
                <span className="h-px flex-1 bg-subtle" />
            </div>
        </div>
    );
};

export default OAuthButtons;
