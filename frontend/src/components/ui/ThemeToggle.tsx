import { useTheme } from "../../contexts/ThemeContext";

interface ThemeToggleProps {
    className?: string;
}

/** Switches the whole app's theme, not just the page it sits on. */
const ThemeToggle = ({ className }: ThemeToggleProps) => {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === "dark";

    return (
        <button
            type="button"
            onClick={toggleTheme}
            aria-pressed={isDark}
            title={`Switch to ${isDark ? "light" : "dark"} mode`}
            className={`flex items-center gap-2 rounded-lg border border-strong px-3 py-2 font-lexend text-sm text-content transition-colors hover:border-brand hover:text-brand ${className ?? ""}`}
        >
            <i
                className={`fa-solid ${isDark ? "fa-moon" : "fa-sun"}`}
                aria-hidden="true"
            ></i>
            <span>{isDark ? "Dark" : "Light"}</span>
        </button>
    );
};

export default ThemeToggle;
