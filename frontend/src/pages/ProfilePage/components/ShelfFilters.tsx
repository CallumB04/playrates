import { useId, useMemo, useRef, useState, type ReactNode } from "react";
import { ListFilter } from "lucide-react";
import type { PlayedStatusFilter } from "@playrates/shared";
import Button from "../../../components/ui/Button";
import Chip from "../../../components/ui/Chip";
import Modal from "../../../components/ui/Modal";
import { popoverClass } from "../../../components/ui/popover";
import {
    PLAYED_STATUSES,
    STATUS_PRESENTATION,
} from "../../../constants/gameStatus";
import { useDismiss } from "../../../hooks/useDismiss";
import { usePlatformSystems } from "../../../hooks/queries/useGames";
import { useWindowSize } from "../../../hooks/useWindowSize";
import { systemIcon } from "../../../lib/platformIcons";

/** "none" is the played logs carrying no ending, a state of its own rather
 *  than the absence of an answer. */
const ENDINGS = [
    {
        value: "none",
        label: STATUS_PRESENTATION.played.label,
        icon: STATUS_PRESENTATION.played.icon,
    },
    ...PLAYED_STATUSES.map((status) => ({
        value: status,
        label: STATUS_PRESENTATION[status].label,
        icon: STATUS_PRESENTATION[status].icon,
    })),
];

interface ShelfFiltersProps {
    /** Only the played shelf has endings to filter by. */
    ending?: {
        value: PlayedStatusFilter | undefined;
        onChange: (value: PlayedStatusFilter | undefined) => void;
    };
    /** The consoles on the shelf, so none on offer comes up empty. */
    consoles: string[];
    console: string | undefined;
    onConsoleChange: (value: string | undefined) => void;
    /** Every filter off at once: one URL change, not one per filter. */
    onClear: () => void;
}

const Group = ({ title, children }: { title: string; children: ReactNode }) => (
    <fieldset>
        <legend className="mb-2 text-label text-content-muted">{title}</legend>
        <div className="flex flex-wrap gap-1.5">{children}</div>
    </fieldset>
);

/**
 * Everything that narrows a shelf, behind one button: a popover from sm up,
 * a bottom sheet on a phone. Each choice applies as it's made.
 */
const ShelfFilters = ({
    ending,
    consoles,
    console: consoleSlug,
    onConsoleChange,
    onClear,
}: ShelfFiltersProps) => {
    const [open, setOpen] = useState(false);
    const wrap = useRef<HTMLDivElement>(null);
    const titleId = useId();
    const phone = useWindowSize().width < 640;
    const { data: systems } = usePlatformSystems();

    const shelfSystems = useMemo(() => {
        const present = new Set(consoles);
        return (systems ?? []).filter((s) => present.has(s.slug));
    }, [consoles, systems]);

    useDismiss([wrap], () => setOpen(false), {
        enabled: open && !phone,
        escape: true,
    });

    const active = (ending?.value ? 1 : 0) + (consoleSlug ? 1 : 0);
    // One console or none is nothing to choose between, unless a link chose.
    const showConsoles = shelfSystems.length > 1 || !!consoleSlug;
    if (!ending && !showConsoles) return null;

    const body = (
        <div className="flex flex-col gap-5">
            {ending && (
                <Group title="How it ended">
                    <Chip
                        selected={!ending.value}
                        onClick={() => ending.onChange(undefined)}
                    >
                        Any
                    </Chip>
                    {ENDINGS.map(({ value, label, icon: Icon }) => (
                        <Chip
                            key={value}
                            selected={ending.value === value}
                            onClick={() =>
                                ending.onChange(value as PlayedStatusFilter)
                            }
                        >
                            <Icon size={13} aria-hidden />
                            {label}
                        </Chip>
                    ))}
                </Group>
            )}
            {showConsoles && (
                <Group title="Console">
                    <Chip
                        selected={!consoleSlug}
                        onClick={() => onConsoleChange(undefined)}
                    >
                        Any
                    </Chip>
                    {shelfSystems.map((system) => {
                        const Icon = systemIcon(
                            system.slug,
                            system.platformSlug
                        );
                        return (
                            <Chip
                                key={system.slug}
                                selected={consoleSlug === system.slug}
                                onClick={() => onConsoleChange(system.slug)}
                            >
                                <Icon size={13} aria-hidden />
                                {system.displayName}
                            </Chip>
                        );
                    })}
                </Group>
            )}
        </div>
    );

    return (
        <div ref={wrap} className="relative shrink-0">
            <Button
                variant="secondary"
                onClick={() => setOpen((was) => !was)}
                aria-expanded={open}
                aria-haspopup="dialog"
                aria-label={active > 0 ? `Filters, ${active} on` : "Filters"}
                className="sm:min-h-9"
            >
                <ListFilter size={15} aria-hidden />
                Filters
                {active > 0 && (
                    <span className="-mr-1 grid size-5 place-items-center rounded-full bg-action font-mono text-label-sm text-action-ink tabular-nums">
                        {active}
                    </span>
                )}
            </Button>

            {open &&
                (phone ? (
                    <Modal onClose={() => setOpen(false)} labelledBy={titleId}>
                        <h2
                            id={titleId}
                            className="border-b border-subtle pb-3 font-display text-section text-content"
                        >
                            Filters
                        </h2>
                        <div className="pt-4">{body}</div>
                        <div className="mt-6 flex flex-col gap-2">
                            <Button size="touch" onClick={() => setOpen(false)}>
                                Done
                            </Button>
                            {active > 0 && (
                                <Button
                                    variant="ghost"
                                    size="touch"
                                    onClick={onClear}
                                >
                                    Clear filters
                                </Button>
                            )}
                        </div>
                    </Modal>
                ) : (
                    <div
                        role="dialog"
                        aria-labelledby={titleId}
                        className={popoverClass(
                            "absolute top-full right-0 z-30 mt-2 w-[22rem] p-4",
                            "menu"
                        )}
                    >
                        <div className="mb-4 flex items-center justify-between">
                            <h2
                                id={titleId}
                                className="font-display text-base font-semibold text-content"
                            >
                                Filters
                            </h2>
                            {active > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onClear}
                                    className="-my-1"
                                >
                                    Clear
                                </Button>
                            )}
                        </div>
                        {body}
                    </div>
                ))}
        </div>
    );
};

export default ShelfFilters;
