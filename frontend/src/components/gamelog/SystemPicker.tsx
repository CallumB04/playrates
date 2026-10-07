import type { PlatformSystem } from "@playrates/shared";
import { systemIcon } from "../../lib/platformIcons";
import { cn } from "../../lib/cn";

interface SystemPickerProps {
    /** The consoles this game is on. */
    systems: PlatformSystem[];
    value: string;
    onChange: (slug: string) => void;
    /** Consoles another of your logs already has. */
    logged: string[];
    labelledBy: string;
    describedBy?: string;
}

/**
 * Which console this log is for. Once a game has a log per console, this is
 * what tells them apart, so every option is in sight: a console you've
 * already logged stays on the list, greyed and marked, so it's clear why it
 * can't be picked rather than mysteriously missing.
 */
const SystemPicker = ({
    systems,
    value,
    onChange,
    logged,
    labelledBy,
    describedBy,
}: SystemPickerProps) => (
    <div
        role="radiogroup"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap"
    >
        {systems.map((system) => {
            const Icon = systemIcon(system.slug, system.platformSlug);
            const taken = logged.includes(system.slug);
            const selected = system.slug === value;
            return (
                <button
                    key={system.slug}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={taken}
                    onClick={() => onChange(system.slug)}
                    className={cn(
                        "flex min-h-11 min-w-0 items-center gap-2 rounded-sm border px-3 text-left text-label-sm lift sm:min-h-10",
                        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                        selected
                            ? "border-brand-deep bg-brand text-content-on-solid shadow-plate"
                            : taken
                              ? "cursor-not-allowed border-dashed border-subtle bg-transparent text-content-muted"
                              : "cursor-pointer border-subtle bg-surface-raised text-content-secondary hover:border-strong hover:text-content"
                    )}
                >
                    <Icon size={14} aria-hidden className="shrink-0" />
                    <span className="truncate">{system.displayName}</span>
                    {taken && (
                        <span className="ml-auto shrink-0 text-[11px] tracking-wide uppercase">
                            Logged
                        </span>
                    )}
                </button>
            );
        })}
    </div>
);

export default SystemPicker;
