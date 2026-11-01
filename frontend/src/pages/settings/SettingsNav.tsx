import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
    SwitcherButton,
    SwitcherSheet,
    SwitcherTileBody,
    switcherTileClass,
} from "../../components/ui/SectionSwitcher";
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

/**
 * A rail on desktop, a row across a tablet. A phone gets the profile's
 * switcher: the row scrolled there, and hid sections past its edge.
 */
const SettingsNav = ({ sections, active, onSelect }: SettingsNavProps) => {
    const fade = useOverflowFade<HTMLElement>();
    const [sheetOpen, setSheetOpen] = useState(false);
    const current = sections.find((s) => s.id === active) ?? sections[0]!;

    return (
        <>
            <SwitcherButton
                icon={current.icon}
                label={current.label}
                open={sheetOpen}
                onOpen={() => setSheetOpen(true)}
            />

            {sheetOpen && (
                <SwitcherSheet
                    title="Settings"
                    titleId="settings-sections-title"
                    onClose={() => setSheetOpen(false)}
                >
                    {sections.map(({ id, label, icon }) => (
                        <li key={id}>
                            <button
                                type="button"
                                aria-current={
                                    id === active ? "page" : undefined
                                }
                                onClick={() => {
                                    onSelect(id);
                                    setSheetOpen(false);
                                }}
                                className={switcherTileClass(id === active)}
                            >
                                <SwitcherTileBody
                                    icon={icon}
                                    label={label}
                                    active={id === active}
                                />
                            </button>
                        </li>
                    ))}
                </SwitcherSheet>
            )}

            <nav
                aria-label="Settings sections"
                ref={fade.ref}
                onScroll={fade.onScroll}
                style={fade.style}
                className="-mx-1 hidden gap-1 overflow-x-auto px-1 pb-1 [contain:layout] sm:flex lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0"
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
                                    ? "bg-surface-raised font-medium text-content"
                                    : "text-content-secondary hover:bg-surface-hover hover:text-content"
                            )}
                        >
                            <Icon
                                size={15}
                                aria-hidden
                                className={cn(
                                    "shrink-0",
                                    isActive
                                        ? "text-brand-text"
                                        : "text-content-muted"
                                )}
                            />
                            {label}
                        </button>
                    );
                })}
            </nav>
        </>
    );
};

export default SettingsNav;
