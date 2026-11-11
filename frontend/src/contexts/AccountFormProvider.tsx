import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AccountFormContext, type AccountFormMode } from "./AccountFormContext";
import { BREAKPOINT, useMediaQuery } from "../hooks/useMediaQuery";

/**
 * Owns the way in: the log-in popup on a wide screen, the /login page on a
 * phone, and the /join page for signing up. Anything that needs to open
 * one reads this rather than being handed a callback.
 */
export const AccountFormProvider = ({ children }: { children: ReactNode }) => {
    const [mode, setMode] = useState<AccountFormMode | null>(null);
    const location = useLocation();

    const navigate = useNavigate();
    const wide = useMediaQuery(BREAKPOINT.md);
    // Signing up and, on a phone, logging in are pages of their own; each
    // takes you back here after.
    const here = `${location.pathname}${location.search}`;
    // On a phone the popup would be a sheet the keyboard all but fills: a
    // page in all but name, and the page handles typing, autofill and
    // scrolling better.
    const open = useCallback(
        (next: AccountFormMode) => {
            if (wide) return setMode(next);
            setMode(null);
            if (location.pathname !== "/login")
                navigate("/login", { state: { from: here, step: next } });
        },
        [wide, navigate, here, location.pathname]
    );
    const openLogin = useCallback(() => open("login"), [open]);
    const openSignup = useCallback(() => {
        setMode(null);
        if (!here.startsWith("/join"))
            navigate("/join", { state: { from: here } });
    }, [navigate, here]);
    const openReset = useCallback(() => open("reset"), [open]);
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
