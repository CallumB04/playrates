import { lazy, Suspense, useState } from "react";
import { useLocation } from "react-router-dom";
import { readAuthLinkResult } from "../../lib/authLinks";
import { useAuth } from "../../contexts/AuthContext";
import { useAccountForm } from "../../contexts/AccountFormContext";
import { owesWelcome } from "./owesWelcome";
import { welcomeHoldsOff } from "./welcomeHoldsOff";

// Seen once per account, so never part of the page anyone else loads.
const WelcomeFlow = lazy(() => import("./welcome/WelcomeFlow"));

/**
 * Shows the welcome to an account that has never been through it: a new
 * one's first sign-in, whether straight after signing up, after the
 * confirmation email or back from Google. Not over the join pages, which
 * say their own welcome first.
 */
const WelcomeGate = () => {
    const { user } = useAuth();
    const { mode } = useAccountForm();
    const { pathname, search, hash } = useLocation();
    /* Open once it's owed, and kept open until it's closed: the end of
       it marks it seen, which would otherwise take it away from the very
       step that says they're done. */
    const [state, setState] = useState<"waiting" | "open" | "closed">(
        "waiting"
    );
    const owed =
        !!user &&
        owesWelcome(user, mode !== null) &&
        !welcomeHoldsOff(pathname) &&
        // A link still on its way to the join pages is about to leave.
        readAuthLinkResult(search, hash) === null;
    if (state === "waiting" && owed) setState("open");
    if (state !== "open" || !user) return null;

    return (
        <Suspense fallback={null}>
            <WelcomeFlow onClose={() => setState("closed")} />
        </Suspense>
    );
};

export default WelcomeGate;
