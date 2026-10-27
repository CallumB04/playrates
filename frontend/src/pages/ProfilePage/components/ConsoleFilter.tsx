import { useMemo } from "react";
import Dropdown from "../../../components/ui/Dropdown";
import { usePlatformSystems } from "../../../hooks/queries/useGames";
import { systemOptions } from "../../../lib/platformIcons";

interface ConsoleFilterProps {
    /** The consoles on the shelf, so none in the list comes up empty. */
    consoles: string[];
    value: string | undefined;
    onChange: (value: string | undefined) => void;
}

/** Narrows a shelf to the games logged on one console. */
const ConsoleFilter = ({ consoles, value, onChange }: ConsoleFilterProps) => {
    const { data: systems } = usePlatformSystems();
    const options = useMemo(() => {
        const present = new Set(consoles);
        return systemOptions(
            (systems ?? []).filter((s) => present.has(s.slug)),
            "All consoles"
        );
    }, [consoles, systems]);

    // One console or none is nothing to choose between, unless a link chose.
    if (consoles.length < 2 && !value) return null;

    return (
        <Dropdown
            options={options}
            value={value ?? ""}
            onChange={(next) => onChange(next || undefined)}
            aria-label="Filter by console"
            className="min-w-0 flex-1 sm:w-44 sm:flex-none"
        />
    );
};

export default ConsoleFilter;
