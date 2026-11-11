import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AccountFormContext, type AccountFormMode } from "./AccountFormContext";

/**
 * Owns the log-in modal, and the way to the sign-up page. Anything that needs to open it reads this
 * rather than being handed a callback.
 */
export const AccountFormProvider = ({ children }: { children: ReactNode }) => {
    const [mode, setMode] = useState<AccountFormMode | null>(null);
    const location = useLocation();

    const openLogin = useCallback(() => setMode("login"), []);
    const navigate = useNavigate();
    // Signing up is a page of its own; it takes you back here after.
    const here = `${location.pathname}${location.search}`;
    const openSignup = useCallback(() => {
        setMode(null);
        if (!here.startsWith("/join"))
            navigate("/join", { state: { from: here } });
    }, [navigate, here]);
    const openReset = useCallback(() => setMode("reset"), []);
    const close = useCallback(() => setMode(null), []);

    // navigating away should dismiss the modal
    useEffect(() => {
        setMode(null);
    }, [location.pathname]);

    const value = useMemo(
        () => ({ mode, openLogin, openSignup, openReset, close }),
        [mode, openLogin, openSignup, openReset, close]
    );

    return (
        <AccountFormContext.Provider value={value}>
            {children}
        </AccountFormContext.Provider>
    );
};
