import type { PlatformSystem } from "@playrates/shared";
import { systemIcon } from "../../../lib/platformIcons";

/** The console chips: the machine's mark and its name. */
const ConsoleChips = ({
    consoles,
    systems,
}: {
    consoles: (string | null)[];
    systems: Map<string, PlatformSystem>;
}) => {
    const named = consoles.filter((slug): slug is string => !!slug);
    // A wish with no console set is for the game wherever it comes out.
    const any = named.length < consoles.length;

    return (
        <ul className="flex min-w-0 flex-wrap gap-1">
            {named.map((slug) => {
                const system = systems.get(slug);
                const Icon = systemIcon(slug, system?.platformSlug ?? "");
                return (
                    <li
                        key={slug}
                        className="inline-flex items-center gap-1 rounded-xs bg-surface-sunken px-1.5 py-0.5 text-label-sm whitespace-nowrap text-content-secondary"
                    >
                        <Icon size={11} aria-hidden />
                        {system?.displayName ?? slug}
                    </li>
                );
            })}
            {any && (
                <li className="inline-flex items-center rounded-xs border border-dashed border-subtle px-1.5 py-0.5 text-label-sm whitespace-nowrap text-content-muted">
                    Any platform
                </li>
            )}
        </ul>
    );
};

export default ConsoleChips;
