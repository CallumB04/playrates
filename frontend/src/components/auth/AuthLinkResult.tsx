import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useNotify } from "../../contexts/NotificationContext";
import { CONFIRMED_PARAM, readAuthLinkResult } from "../../lib/authLinks";

/**
 * Says what an emailed link did when it lands: confirmed and signed in, or
 * run out. Then tidies the address, so a reload says nothing twice.
 */
const AuthLinkResult = () => {
    const { search, hash, pathname } = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const notify = useNotify();
    const said = useRef(false);
    const result = readAuthLinkResult(search, hash);

    useEffect(() => {
        if (!result || said.current) return;
        // Signed in on the way, but the profile takes a moment to arrive.
        if (result === "confirmed" && !user) return;
        said.current = true;

        if (result === "confirmed") {
            notify("Email confirmed. Welcome to PlayRates", "success");
        } else {
            notify(
                result === "expired"
                    ? "That link has run out or was used already. Log in and we'll send a new one."
                    : "That link didn't work. Log in to try again.",
                // Not with log-in open over it: under a popup's scrim a toast
                // can't be read.
                "error"
            );
        }
        const rest = new URLSearchParams(search);
        rest.delete(CONFIRMED_PARAM);
        const query = rest.toString();
        navigate(`${pathname}${query ? `?${query}` : ""}`, { replace: true });
    }, [result, user, search, pathname, navigate, notify]);

    return null;
};

export default AuthLinkResult;
