import { useState } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";
import Modal from "../../components/ui/Modal";
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
 * A rail on desktop, a row across a tablet. A phone gets one control that
 * says where you are and opens the rest in a sheet: the row scrolled there,
 * and hid sections past its edge.
 */
const SettingsNav = ({ sections, active, onSelect }: SettingsNavProps) => {
    const fade = useOverflowFade<HTMLElement>();
    const [sheetOpen, setSheetOpen] = useState(false);
    const current = sections.find((s) => s.id === active) ?? sections[0]!;
    const CurrentIcon = current.icon;

    return (
        <>
            <button
                type="button"
                aria-haspopup="dialog"
                aria-expanded={sheetOpen}
                onClick={() => setSheetOpen(true)}
                className="flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-md border border-subtle bg-surface-raised py-2 pr-3 pl-2 text-left shadow-lip lift focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:hidden"
            >
                <CurrentIcon
                    size={18}
                    aria-hidden
                    className="ml-1.5 shrink-0 text-brand"
                />
                <span className="min-w-0 flex-1 text-body font-medium text-content">
                    {current.label}
                </span>
                <span className="flex items-center gap-1 rounded-full bg-surface-sunken py-1 pr-2 pl-2.5 text-label-sm text-content-secondary">
                    Sections
                    <ChevronDown size={14} aria-hidden />
                </span>
            </button>

            {sheetOpen && (
                <Modal
                    onClose={() => setSheetOpen(false)}
                    labelledBy="settings-sections-title"
                    className="w-full max-w-sm"
                >
                    <h2
                        id="settings-sections-title"
                        className="pr-10 font-display text-section text-content"
                    >
                        Settings
                    </h2>
                    <ul className="mt-4 flex flex-col gap-1.5">
                        {sections.map(({ id, label, icon: Icon }) => {
                            const isActive = id === active;
                            return (
                                <li key={id}>
                                    <button
                                        type="button"
                                        aria-current={
                                            isActive ? "page" : undefined
                                        }
                                        onClick={() => {
                                            onSelect(id);
                                            setSheetOpen(false);
                                        }}
                                        className={cn(
                                            "flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-md p-2 pr-3 text-left lift",
                                            "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
                                            isActive
                                                ? "bg-surface-sunken text-content"
                                                : "text-content-secondary hover:bg-surface-hover hover:text-content"
                                        )}
                                    >
                                        <Icon
                                            size={18}
                                            aria-hidden
                                            className={cn(
                                                "ml-1 shrink-0",
                                                isActive
                                                    ? "text-brand"
                                                    : "text-content-muted"
                                            )}
                                        />
                                        <span
                                            className={cn(
                                                "flex-1 text-body",
                                                isActive && "font-medium"
                                            )}
                                        >
                                            {label}
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </Modal>
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
                                        ? "text-brand"
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
