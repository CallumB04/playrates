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

export type AccountFormMode = "login" | "signup";

interface AccountFormContextValue {
    mode: AccountFormMode | null;
    openLogin: () => void;
    openSignup: () => void;
    close: () => void;
}

const AccountFormContext = createContext<AccountFormContextValue | null>(null);

/**
 * Owns the signup/login modal, so `openLoginForm`, `openSignupForm` and
 * `closeAccountForm` no longer have to be threaded through Navbar, HomePage,
 * ProfilePage and GamePage as props.
 */
export const AccountFormProvider = ({ children }: { children: ReactNode }) => {
    const [mode, setMode] = useState<AccountFormMode | null>(null);
    const location = useLocation();

    const openLogin = useCallback(() => setMode("login"), []);
    const openSignup = useCallback(() => setMode("signup"), []);
    const close = useCallback(() => setMode(null), []);

    // close on navigation; the Navbar used to do this itself on every render
    useEffect(() => {
        setMode(null);
    }, [location.pathname]);

    const value = useMemo(
        () => ({ mode, openLogin, openSignup, close }),
        [mode, openLogin, openSignup, close]
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
