import { useId, useRef, useState, type KeyboardEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { queryKeys, searchGames } from "../../api";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useDismiss } from "../../hooks/useDismiss";
import { releaseYear } from "../../lib/format";
import { cn } from "../../lib/cn";
import GameCover from "../game/GameCover";
import LoadingSpinner from "../LoadingSpinner";
import { SearchInput } from "../ui/Input";
import Button from "../ui/Button";

export interface PickedGame {
    id: number;
    title: string;
    coverUrl: string | null;
    releaseDate?: string | null;
}

interface GamePickerProps {
    value: PickedGame | null;
    onChange: (game: PickedGame | null) => void;
    id?: string;
    "aria-describedby"?: string;
    "aria-invalid"?: true;
}

const RESULTS = 6;

/**
 * Choose the game a thread is about. Once chosen it shows as the game, not a
 * field, with a way to change it — the common arrival is from a game's own
 * page with the choice already made.
 */
const GamePicker = ({ value, onChange, ...a11y }: GamePickerProps) => {
    const listId = useId();
    const [term, setTerm] = useState("");
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);
    const wrapRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const debounced = useDebouncedValue(term.trim(), 250);
    const hasTerm = debounced.length >= 2;

    const { data, isFetching } = useQuery({
        queryKey: queryKeys.games.pick(debounced),
        queryFn: () => searchGames(debounced, RESULTS),
        enabled: hasTerm && !value,
        staleTime: 30_000,
    });
    const results = hasTerm ? (data?.data ?? []).slice(0, RESULTS) : [];

    useDismiss([wrapRef], () => setOpen(false), { enabled: open });

    const choose = (game: PickedGame) => {
        onChange(game);
        setTerm("");
        setOpen(false);
    };

    if (value) {
        return (
            <div className="flex items-center gap-3 rounded-sm border border-subtle bg-surface-field p-2 pr-2.5">
                <GameCover
                    coverUrl={value.coverUrl}
                    title={value.title}
                    className="aspect-3/4 w-10 shrink-0 overflow-hidden rounded-xs"
                />
                <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-content">
                        {value.title}
                    </span>
                    {value.releaseDate && (
                        <span className="font-mono text-label-sm text-content-muted">
                            {releaseYear(value.releaseDate)}
                        </span>
                    )}
                </span>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="min-h-11 sm:min-h-9"
                    onClick={() => {
                        onChange(null);
                        requestAnimationFrame(() => inputRef.current?.focus());
                    }}
                >
                    <X size={14} aria-hidden />
                    Change
                </Button>
            </div>
        );
    }

    const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") return setOpen(false);
        if (results.length === 0) return;
        if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            setActive((i) => Math.min(results.length - 1, i + 1));
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((i) => Math.max(0, i - 1));
        } else if (event.key === "Enter" && open) {
            event.preventDefault();
            const game = results[active];
            if (game) choose(game);
        }
    };

    const showList = open && hasTerm;

    return (
        <div ref={wrapRef} className="relative">
            <Search
                size={15}
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-content-muted"
            />
            <SearchInput
                ref={inputRef}
                {...a11y}
                role="combobox"
                aria-expanded={showList}
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={
                    showList && results[active]
                        ? `${listId}-${results[active].id}`
                        : undefined
                }
                autoComplete="off"
                placeholder="Search for a game"
                value={term}
                onChange={(event) => {
                    setTerm(event.target.value);
                    setActive(0);
                    setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onKeyDown={onKeyDown}
            />

            {showList && (
                <ul
                    id={listId}
                    role="listbox"
                    aria-label="Games"
                    className="absolute inset-x-0 top-full z-20 mt-1.5 max-h-80 overflow-y-auto rounded-md border border-subtle bg-surface-overlay p-1 shadow-lifted"
                >
                    {results.length === 0 ? (
                        <li className="flex items-center gap-2 px-3 py-3 text-body-sm text-content-muted">
                            {isFetching ? (
                                <>
                                    <LoadingSpinner size="xs" label={null} />
                                    Searching…
                                </>
                            ) : (
                                "No games match that."
                            )}
                        </li>
                    ) : (
                        results.map((game, i) => (
                            <li
                                key={game.id}
                                id={`${listId}-${game.id}`}
                                role="option"
                                aria-selected={i === active}
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => choose(game)}
                                onMouseEnter={() => setActive(i)}
                                className={cn(
                                    "flex min-h-11 cursor-pointer items-center gap-3 rounded-sm px-2 py-1.5 text-body-sm text-content",
                                    i === active && "bg-surface-hover"
                                )}
                            >
                                <GameCover
                                    coverUrl={game.coverUrl}
                                    title={game.title}
                                    className="aspect-3/4 w-7 shrink-0 overflow-hidden rounded-xs"
                                />
                                <span className="min-w-0 flex-1 truncate">
                                    {game.title}
                                </span>
                                <span className="shrink-0 font-mono text-label-sm text-content-muted">
                                    {releaseYear(game.releaseDate)}
                                </span>
                            </li>
                        ))
                    )}
                </ul>
            )}
        </div>
    );
};

export default GamePicker;
