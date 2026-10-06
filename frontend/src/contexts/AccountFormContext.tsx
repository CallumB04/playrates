import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";

export type AccountFormMode = "login" | "signup" | "reset";

interface AccountFormContextValue {
    mode: AccountFormMode | null;
    openLogin: () => void;
    openSignup: () => void;
    /** The forgotten-password form, in the same popup. */
    openReset: () => void;
    close: () => void;
}

const AccountFormContext = createContext<AccountFormContextValue | null>(null);

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

export const useAccountForm = (): AccountFormContextValue => {
    const context = useContext(AccountFormContext);
    if (!context) {
        throw new Error(
            "useAccountForm must be used within an AccountFormProvider"
        );
    }
    return context;
};
