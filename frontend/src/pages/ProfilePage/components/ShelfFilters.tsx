import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ListFilter } from "lucide-react";
import type { PlayedStatusFilter } from "@playrates/shared";
import Button from "../../../components/ui/Button";
import Dropdown from "../../../components/ui/Dropdown";
import Field from "../../../components/ui/Field";
import { fieldClass } from "../../../components/ui/Input";
import Modal from "../../../components/ui/Modal";
import { popoverClass } from "../../../components/ui/popover";
import {
    PLAYED_STATUSES,
    STATUS_PRESENTATION,
} from "../../../constants/gameStatus";
import { usePlatformSystems } from "../../../hooks/queries/useGames";
import { useWindowSize } from "../../../hooks/useWindowSize";
import { cn } from "../../../lib/cn";
import { systemOptions } from "../../../lib/platformIcons";

/** "none" is the played logs carrying no ending, a state of its own rather
 *  than the absence of an answer. */
const ENDINGS = [
    { value: "", label: "All played" },
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

/**
 * Everything that narrows a shelf, behind one button: a popover from sm up,
 * a bottom sheet on a phone. A dropdown per filter, so another filter is
 * another row. Each choice applies as it's made.
 */
const ShelfFilters = ({
    ending,
    consoles,
    console: consoleSlug,
    onConsoleChange,
    onClear,
}: ShelfFiltersProps) => {
    const [open, setOpen] = useState(false);
    const titleId = useId();
    const phone = useWindowSize().width < 640;
    const { data: systems } = usePlatformSystems();

    const shelfSystems = useMemo(() => {
        const present = new Set(consoles);
        return (systems ?? []).filter((s) => present.has(s.slug));
    }, [consoles, systems]);

    /* Not useDismiss: a dropdown's menu is portalled to the body, so to the
       DOM a pick in it is a press outside. React carries the press up
       through the portal to the wrapper, which marks it before the document
       hears it. */
    const pressedInside = useRef(false);
    useEffect(() => {
        if (!open || phone) return;
        // The press that opened it is behind it.
        pressedInside.current = false;
        const onPointerDown = () => {
            if (!pressedInside.current) setOpen(false);
            pressedInside.current = false;
        };
        // A dropdown closing itself on Escape has had its say.
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" && !event.defaultPrevented) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("mousedown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [open, phone]);

    const active = (ending?.value ? 1 : 0) + (consoleSlug ? 1 : 0);
    // One console or none is nothing to choose between, unless a link chose.
    const showConsoles = shelfSystems.length > 1 || !!consoleSlug;
    if (!ending && !showConsoles) return null;

    const body = (
        <div className="flex flex-col gap-4">
            {ending && (
                <Field label="How it ended">
                    {({ id }) => (
                        <Dropdown
                            id={id}
                            options={ENDINGS}
                            value={ending.value ?? ""}
                            onChange={(next) =>
                                ending.onChange(
                                    (next || undefined) as
                                        PlayedStatusFilter | undefined
                                )
                            }
                        />
                    )}
                </Field>
            )}
            {showConsoles && (
                <Field label="Console">
                    {({ id }) => (
                        <Dropdown
                            id={id}
                            options={systemOptions(
                                shelfSystems,
                                "All consoles"
                            )}
                            value={consoleSlug ?? ""}
                            onChange={(next) =>
                                onConsoleChange(next || undefined)
                            }
                        />
                    )}
                </Field>
            )}
        </div>
    );

    return (
        <div
            className="relative shrink-0"
            onMouseDown={() => {
                pressedInside.current = true;
            }}
        >
            {/* The field's own skin, so it sits level with the sort beside
                it rather than as a smaller button. */}
            <button
                type="button"
                onClick={() => setOpen((was) => !was)}
                aria-expanded={open}
                aria-haspopup="dialog"
                aria-label={active > 0 ? `Filters, ${active} on` : "Filters"}
                className={fieldClass(
                    cn(
                        "flex cursor-pointer items-center gap-2 whitespace-nowrap",
                        open && "border-brand shadow-glow"
                    )
                )}
            >
                <ListFilter
                    size={15}
                    aria-hidden
                    className="text-content-secondary"
                />
                Filters
                {active > 0 && (
                    <span className="-mr-1 grid size-5 place-items-center rounded-full bg-action font-mono text-label-sm text-action-ink tabular-nums">
                        <span className="cap-box">{active}</span>
                    </span>
                )}
            </button>

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
                            "absolute top-full right-0 z-30 mt-2 w-72 p-4",
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
