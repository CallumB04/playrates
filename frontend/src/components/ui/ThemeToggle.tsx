import { useTheme } from "../../contexts/ThemeContext";
import Toggle from "./Toggle";

interface ThemeToggleProps {
    className?: string;
}

/** Switches the whole app's theme, not just the page it sits on. */
const ThemeToggle = ({ className }: ThemeToggleProps) => {
    const { theme, setPreference } = useTheme();

    return (
        <Toggle
            checked={theme === "dark"}
            onChange={(dark) => setPreference(dark ? "dark" : "light")}
            offLabel="Day"
            label="Night"
            labelPosition="flanked"
            className={className}
        />
    );
};

export default ThemeToggle;
