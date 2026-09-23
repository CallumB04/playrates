import type { LucideIcon } from "lucide-react";
import { useOverflowFade } from "../../hooks/useOverflowFade";
import { cn } from "../../lib/cn";

export interface SettingsSection {
    id: string;
    label: string;
    icon: LucideIcon;
}

interface SettingsNavProps {
    sections: SettingsSection[];
    active: string;
    onSelect: (id: string) => void;
}

/** A rail on desktop, a scrolling strip on a phone. */
const SettingsNav = ({ sections, active, onSelect }: SettingsNavProps) => {
    const fade = useOverflowFade<HTMLElement>();

    return (
        <nav
            aria-label="Settings sections"
            ref={fade.ref}
            onScroll={fade.onScroll}
            style={fade.style}
            className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 [contain:layout] lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0"
        >
            {sections.map(({ id, label, icon: Icon }) => {
                const isActive = id === active;
                return (
                    <button
                        key={id}
                        type="button"
                        aria-current={isActive ? "page" : undefined}
                        onClick={() => onSelect(id)}
                        className={cn(
                            "flex min-h-11 shrink-0 cursor-pointer items-center gap-2.5 rounded-sm px-3 py-2 text-body-sm lift sm:min-h-0 lg:w-full",
                            "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
                            isActive
                                ? "bg-surface-raised font-medium text-content inset-shadow-deep"
                                : "text-content-secondary hover:bg-surface-hover hover:text-content"
                        )}
                    >
                        <Icon
                            size={15}
                            aria-hidden
                            className={cn(
                                "shrink-0",
                                isActive ? "text-brand" : "text-content-muted"
                            )}
                        />
                        {label}
                    </button>
                );
            })}
        </nav>
    );
};

export default SettingsNav;
