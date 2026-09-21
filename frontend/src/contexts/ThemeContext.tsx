import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";

export type Theme = "light" | "dark";

/** Vellum is built for the dark. Kept in one place so the boot script in
 *  index.html agrees. */
export const DEFAULT_THEME: Theme = "dark";
export const THEME_STORAGE_KEY = "playrates-theme";

interface ThemeContextValue {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const readStoredTheme = (): Theme => {
    try {
        const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
        return stored === "light" || stored === "dark" ? stored : DEFAULT_THEME;
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

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    // matches what the boot script in index.html already applied
    const [theme, setThemeState] = useState<Theme>(readStoredTheme);

    useEffect(() => {
        applyTheme(theme);
        try {
            window.localStorage.setItem(THEME_STORAGE_KEY, theme);
        } catch {
            // not fatal: the theme just won't survive a reload
        }
    }, [theme]);

    const setTheme = useCallback((next: Theme) => setThemeState(next), []);
    const toggleTheme = useCallback(
        () => setThemeState((t) => (t === "dark" ? "light" : "dark")),
        []
    );

    const value = useMemo(
        () => ({ theme, setTheme, toggleTheme }),
        [theme, setTheme, toggleTheme]
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
