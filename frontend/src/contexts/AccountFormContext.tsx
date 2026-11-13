import { createContext, useContext } from "react";

export type AccountFormMode = "login" | "reset";

export interface AccountFormContextValue {
    mode: AccountFormMode | null;
    openLogin: () => void;
    openSignup: () => void;
    /** The forgotten-password form, in the same popup. */
    openReset: () => void;
    close: () => void;
}

export const AccountFormContext = createContext<AccountFormContextValue | null>(
    null
);

export const useAccountForm = (): AccountFormContextValue => {
    const context = useContext(AccountFormContext);
    if (!context) {
        throw new Error(
            "useAccountForm must be used within an AccountFormProvider"
        );
    }
    return context;
};
