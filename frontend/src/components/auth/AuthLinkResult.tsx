import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { readAuthLinkResult } from "../../lib/authLinks";

/**
 * Takes an emailed link, wherever it lands, on to the page that says what
 * it did. The address in the email stays the site's root, so links sent
 * before that page existed still work.
 *
 * A confirmed link waits for its sign-in to settle first: Supabase reads
 * the link's code from the address, and leaving it any sooner would lose it.
 */
const AuthLinkResult = () => {
    const { search, hash } = useLocation();
    const navigate = useNavigate();
    const { session, isLoading } = useAuth();
    const went = useRef(false);
    const result = readAuthLinkResult(search, hash);

    useEffect(() => {
        if (!result || went.current) return;
        if (result === "confirmed" && isLoading) return;
        went.current = true;
        // Confirmed but no session to show for it: the link didn't take.
        const problem =
            result === "confirmed" ? (session ? null : "failed") : result;
        navigate(
            problem ? `/join/confirmed?link=${problem}` : "/join/confirmed",
            { replace: true }
        );
    }, [result, isLoading, session, navigate]);

    return null;
};

export default AuthLinkResult;
