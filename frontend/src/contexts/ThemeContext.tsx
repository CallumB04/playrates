import { createContext, useContext } from "react";

/** What the page is painted in. */
export type Theme = "light" | "dark";
/** What the user chose. "system" follows the OS and can change while open. */
export type ThemePreference = Theme | "system";

/** Vellum is built for the dark. Kept in one place so the boot script in
 *  public/theme-init.js agrees. */
export const DEFAULT_THEME: Theme = "dark";
export const THEME_STORAGE_KEY = "playrates-theme";

export const SYSTEM_QUERY = "(prefers-color-scheme: light)";

export interface ThemeContextValue {
    /** The resolved theme, for anything that needs to know which one is on. */
    theme: Theme;
    preference: ThemePreference;
    setPreference: (preference: ThemePreference) => void;
    toggleTheme: () => void;
    /** Told by the session: signed out, the site is always dark. */
    setSignedIn: (signedIn: boolean) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export const readStoredPreference = (): ThemePreference => {
    try {
        const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
        return stored === "light" || stored === "dark" || stored === "system"
            ? stored
            : DEFAULT_THEME;
    } catch {
        // private browsing / storage disabled
        return DEFAULT_THEME;
    }
};

/** Whether a signed-in session is kept in this browser: Supabase's own
 *  key, whatever the project. public/theme-init.js asks the same before
 *  the first paint. */
export const hasStoredSession = (): boolean => {
    try {
        return Object.keys(window.localStorage).some((key) =>
            /^sb-.+-auth-token$/.test(key)
        );
    } catch {
        return false;
    }
};

/**
 * The theme on the page. Signed out it's always the dark the site is made
 * for; a choice is a member's, kept for when they're back.
 */
export const resolveTheme = (
    preference: ThemePreference,
    system: Theme,
    signedIn: boolean
): Theme =>
    !signedIn ? DEFAULT_THEME : preference === "system" ? system : preference;

export const applyTheme = (theme: Theme): void => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    // themes native controls (scrollbars, date pickers) to match
    root.style.colorScheme = theme;
};

export const useTheme = (): ThemeContextValue => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
};
