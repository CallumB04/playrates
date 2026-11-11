import { lazy, Suspense, useState } from "react";
import { useLocation } from "react-router-dom";
import { readAuthLinkResult } from "../../lib/authLinks";
import { useAuth } from "../../contexts/AuthContext";
import { useAccountForm } from "../../contexts/AccountFormContext";
import { useMarkOnboarded } from "../../hooks/queries/useProfiles";
import { owesWelcome } from "./owesWelcome";

// Seen once per account, so never part of the page anyone else loads.
const WelcomePopup = lazy(() => import("./WelcomePopup"));

/**
 * Shows the welcome to an account that has never dismissed it — so a new
 * one's first sign-in, whether that is straight after signup or after the
 * confirmation email.
 *
 * Marked as seen on any way out, skipped or finished, so it shows once. A tab
 * closed mid-way has not dismissed it, and the next sign-in offers it again.
 */
const FirstLoginWelcome = () => {
    const { user } = useAuth();
    const { mode } = useAccountForm();
    const { pathname, search, hash } = useLocation();
    // The join pages say their own welcome first, and a link still on its
    // way to them is about to leave this page.
    const joining =
        pathname.startsWith("/join") ||
        readAuthLinkResult(search, hash) !== null;
    const markOnboarded = useMarkOnboarded();
    // Closes on the spot rather than waiting for the round trip to say so.
    const [dismissed, setDismissed] = useState(false);

    if (!user || dismissed || joining || !owesWelcome(user, mode !== null))
        return null;

    return (
        <Suspense fallback={null}>
            <WelcomePopup
                profile={user}
                onClose={() => {
                    setDismissed(true);
                    markOnboarded.mutate();
                }}
            />
        </Suspense>
    );
};

export default FirstLoginWelcome;
