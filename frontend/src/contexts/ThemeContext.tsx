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
