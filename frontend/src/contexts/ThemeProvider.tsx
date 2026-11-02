import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import { useMediaQuery } from "../hooks/useMediaQuery";
import {
    applyTheme,
    readStoredPreference,
    SYSTEM_QUERY,
    ThemeContext,
    THEME_STORAGE_KEY,
    type Theme,
    type ThemePreference,
} from "./ThemeContext";

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    // matches what public/theme-init.js already applied
    const [preference, setPreferenceState] =
        useState<ThemePreference>(readStoredPreference);
    /* Live, since the OS can flip at sunset with the tab already open. With
       nothing to ask it reads false, which lands on the dark default. */
    const system: Theme = useMediaQuery(SYSTEM_QUERY) ? "light" : "dark";

    const theme = preference === "system" ? system : preference;

    useEffect(() => {
        applyTheme(theme);
        try {
            window.localStorage.setItem(THEME_STORAGE_KEY, preference);
        } catch {
            // not fatal: the choice just won't survive a reload
        }
    }, [theme, preference]);

    const setPreference = useCallback(
        (next: ThemePreference) => setPreferenceState(next),
        []
    );

    /* The one-press switch always lands on a concrete theme, so pressing it
       while following the system means you have stopped following it. */
    const toggleTheme = useCallback(
        () => setPreferenceState(theme === "dark" ? "light" : "dark"),
        [theme]
    );

    const value = useMemo(
        () => ({ theme, preference, setPreference, toggleTheme }),
        [theme, preference, setPreference, toggleTheme]
    );

    return (
        <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
    );
};
