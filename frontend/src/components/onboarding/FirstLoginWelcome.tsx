import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useAccountForm } from "../../contexts/AccountFormContext";
import { useMarkOnboarded } from "../../hooks/queries/useProfiles";
import WelcomePopup from "./WelcomePopup";
import { owesWelcome } from "./owesWelcome";

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
    const markOnboarded = useMarkOnboarded();
    // Closes on the spot rather than waiting for the round trip to say so.
    const [dismissed, setDismissed] = useState(false);

    if (!user || dismissed || !owesWelcome(user, mode !== null)) return null;

    return (
        <WelcomePopup
            profile={user}
            onClose={() => {
                setDismissed(true);
                markOnboarded.mutate();
            }}
        />
    );
};

export default FirstLoginWelcome;
