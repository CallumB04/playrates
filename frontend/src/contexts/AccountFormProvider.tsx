import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";
import { AccountFormContext, type AccountFormMode } from "./AccountFormContext";

/**
 * Owns the signup/login modal. Anything that needs to open it reads this
 * rather than being handed a callback.
 */
export const AccountFormProvider = ({ children }: { children: ReactNode }) => {
    const [mode, setMode] = useState<AccountFormMode | null>(null);
    const location = useLocation();

    const openLogin = useCallback(() => setMode("login"), []);
    const openSignup = useCallback(() => setMode("signup"), []);
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
