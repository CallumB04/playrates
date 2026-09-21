import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";

/** What the page is painted in. */
export type Theme = "light" | "dark";
/** What the user chose. "system" follows the OS and can change while open. */
export type ThemePreference = Theme | "system";

/** Vellum is built for the dark. Kept in one place so the boot script in
 *  index.html agrees. */
export const DEFAULT_THEME: Theme = "dark";
export const THEME_STORAGE_KEY = "playrates-theme";

const SYSTEM_QUERY = "(prefers-color-scheme: light)";

interface ThemeContextValue {
    /** The resolved theme, for anything that needs to know which one is on. */
    theme: Theme;
    preference: ThemePreference;
    setPreference: (preference: ThemePreference) => void;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

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

export const systemTheme = (): Theme => {
    if (typeof window === "undefined" || !window.matchMedia) {
        return DEFAULT_THEME;
    }
    return window.matchMedia(SYSTEM_QUERY).matches ? "light" : "dark";
};

export const resolveTheme = (preference: ThemePreference): Theme =>
    preference === "system" ? systemTheme() : preference;

export const applyTheme = (theme: Theme): void => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    // themes native controls (scrollbars, date pickers) to match
    root.style.colorScheme = theme;
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    // matches what the boot script in index.html already applied
    const [preference, setPreferenceState] =
        useState<ThemePreference>(readStoredPreference);
    const [system, setSystem] = useState<Theme>(systemTheme);

    /* Only while following the system: the OS can flip at sunset with the tab
       already open. */
    useEffect(() => {
        if (preference !== "system" || !window.matchMedia) return;
        const media = window.matchMedia(SYSTEM_QUERY);
        const onChange = () => setSystem(media.matches ? "light" : "dark");
        onChange();
        media.addEventListener("change", onChange);
        return () => media.removeEventListener("change", onChange);
    }, [preference]);

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

export const useTheme = (): ThemeContextValue => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
};
