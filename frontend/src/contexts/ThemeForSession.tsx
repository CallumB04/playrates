import { useEffect } from "react";
import { useAuth } from "./AuthContext";
import { useTheme } from "./ThemeContext";

/** Tells the theme whether anyone's signed in, from inside the auth that
 *  knows: the theme sits outside it, as the error screens need it too. */
export const ThemeForSession = () => {
    const { session, isLoading } = useAuth();
    const { setSignedIn } = useTheme();
    useEffect(() => {
        // Still restoring: keep what storage said rather than flash dark.
        if (!isLoading) setSignedIn(!!session);
    }, [session, isLoading, setSignedIn]);
    return null;
};
