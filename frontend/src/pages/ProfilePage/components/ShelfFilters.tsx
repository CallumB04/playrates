import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ListFilter, Search } from "lucide-react";
import type { PlayedStatusFilter } from "@playrates/shared";
import Button from "../../../components/ui/Button";
import Dropdown from "../../../components/ui/Dropdown";
import Field from "../../../components/ui/Field";
import { fieldClass } from "../../../components/ui/fieldClass";
import { SearchInput } from "../../../components/ui/Input";
import Modal from "../../../components/ui/Modal";
import Toggle from "../../../components/ui/Toggle";
import { popoverClass } from "../../../components/ui/popover";
import {
    PLAYED_STATUSES,
    STATUS_PRESENTATION,
} from "../../../constants/gameStatus";
import { useGenres, usePlatformSystems } from "../../../hooks/queries/useGames";
import { useWindowSize } from "../../../hooks/useWindowSize";
import { cn } from "../../../lib/cn";
import { formatCount } from "../../../lib/format";
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

/** The popover's width, w-96, and the room it needs to the button's left. */
const POPOVER_PX = 384;

interface ShelfFiltersProps {
    /** A title to narrow the shelf to: what's typed, and whether it has
     *  settled into the URL yet. */
    search: {
        term: string;
        onChange: (term: string) => void;
        active: boolean;
    };
    /** Only the played shelf has endings to filter by. */
    ending?: {
        value: PlayedStatusFilter | undefined;
        onChange: (value: PlayedStatusFilter | undefined) => void;
    };
    /** The consoles on the shelf, so none on offer comes up empty. */
    consoles: string[];
    console: string | undefined;
    onConsoleChange: (value: string | undefined) => void;
    /** The genres on the shelf, as slugs, so none on offer comes up empty. */
    genres: string[];
    genre: string | undefined;
    onGenreChange: (value: string | undefined) => void;
    /** Only on someone else's profile, to a viewer with logs of their own.
     *  `count` is how many it would leave, the other filters applied. */
    common?: {
        on: boolean;
        count: number | undefined;
        onChange: (on: boolean) => void;
    };
    /** Every filter off at once: one URL change, not one per filter. */
    onClear: () => void;
}

/**
 * Everything that narrows a shelf, behind one button: a popover from sm up,
 * a bottom sheet on a phone. A field per filter, so another filter is
 * another row. Each choice applies as it's made, the title as typing
 * pauses.
 */
const ShelfFilters = ({
    search,
    ending,
    consoles,
    console: consoleSlug,
    onConsoleChange,
    genres,
    genre,
    onGenreChange,
    common,
    onClear,
}: ShelfFiltersProps) => {
    const [open, setOpen] = useState(false);
    const wrapper = useRef<HTMLDivElement>(null);
    /* The popover hangs left from the button, which suits it at the end of
       the row. Where the row wraps the button starts the next line, and
       there it would hang off the page, so it opens rightwards instead. */
    const [opensRight, setOpensRight] = useState(false);
    const titleId = useId();
    const phone = useWindowSize().width < 640;
    const { data: systems } = usePlatformSystems();
    const { data: allGenres } = useGenres();

    const shelfSystems = useMemo(() => {
        const present = new Set(consoles);
        return (systems ?? []).filter((s) => present.has(s.slug));
    }, [consoles, systems]);

    const genreOptions = useMemo(() => {
        const present = new Set(genres);
        return [
            { value: "", label: "All genres" },
            ...(allGenres ?? [])
                .filter((g) => present.has(g.slug))
                .map((g) => ({ value: g.slug, label: g.name })),
        ];
    }, [genres, allGenres]);

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

    const active =
        (search.active ? 1 : 0) +
        (ending?.value ? 1 : 0) +
        (consoleSlug ? 1 : 0) +
        (genre ? 1 : 0) +
        (common?.on ? 1 : 0);
    // One console or none is nothing to choose between, unless a link chose.
    const showConsoles = shelfSystems.length > 1 || !!consoleSlug;
    // The same for genres, counting "All genres".
    const showGenres = genreOptions.length > 2 || !!genre;

    const body = (
        <div className="flex flex-col gap-4">
            <Field label="Title">
                {({ id }) => (
                    <div className="relative">
                        <Search
                            size={15}
                            aria-hidden
                            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-content-muted"
                        />
                        <SearchInput
                            id={id}
                            placeholder="Search titles"
                            value={search.term}
                            onChange={(event) =>
                                search.onChange(event.target.value)
                            }
                        />
                    </div>
                )}
            </Field>
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
                <Field label="Platform">
                    {({ id }) => (
                        <Dropdown
                            id={id}
                            options={systemOptions(
                                shelfSystems,
                                "All platforms"
                            )}
                            value={consoleSlug ?? ""}
                            onChange={(next) =>
                                onConsoleChange(next || undefined)
                            }
                        />
                    )}
                </Field>
            )}
            {showGenres && (
                <Field label="Genre">
                    {({ id }) => (
                        <Dropdown
                            id={id}
                            options={genreOptions}
                            value={genre ?? ""}
                            onChange={(next) =>
                                onGenreChange(next || undefined)
                            }
                        />
                    )}
                </Field>
            )}
            {common && (
                <Toggle
                    checked={common.on}
                    onChange={common.onChange}
                    label={
                        common.count === undefined
                            ? "Only show games you have both logged"
                            : `Only show games you have both logged (${formatCount(common.count)})`
                    }
                />
            )}
        </div>
    );

    return (
        <div
            ref={wrapper}
            className="relative shrink-0"
            onMouseDown={() => {
                pressedInside.current = true;
            }}
        >
            {/* The field's own skin, so it sits level with the sort beside
                it rather than as a smaller button. */}
            <button
                type="button"
                onClick={() => {
                    const right =
                        wrapper.current?.getBoundingClientRect().right;
                    setOpensRight(right !== undefined && right < POPOVER_PX);
                    setOpen((was) => !was);
                }}
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
                            cn(
                                "absolute top-full z-30 mt-2 w-96 p-4",
                                opensRight ? "left-0" : "right-0"
                            ),
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
