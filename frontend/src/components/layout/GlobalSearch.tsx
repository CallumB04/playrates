import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { LoaderCircle, Search } from "lucide-react";
import { queryKeys, searchGames, searchProfiles } from "../../api";
import { useAuth } from "../../contexts/AuthContext";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import GameCover from "../game/GameCover";
import ProfilePicture from "../ProfilePicture";
import { releaseYear } from "../../lib/format";
import { cn } from "../../lib/cn";

/** Three per section: enough to recognise a hit, short enough to scan. */
const PER_SECTION = 3;

interface Row {
    key: string;
    to: string;
    render: () => React.ReactNode;
}

interface GlobalSearchProps {
    /** `bar` is the masthead field, shown from `xl`. `overlay` is the phone's
     *  full-screen search: already open, results in a plain column. */
    variant?: "bar" | "overlay";
    /** Overlay only: dismiss after navigating or on Escape. */
    onClose?: () => void;
}

/**
 * Search games and people. Two sections rather than one ranked list, so
 * neither kind gets buried under the other.
 */
const GlobalSearch = ({ variant = "bar", onClose }: GlobalSearchProps) => {
    const navigate = useNavigate();
    const isOverlay = variant === "overlay";
    const [term, setTerm] = useState("");
    const [open, setOpen] = useState(isOverlay);
    const [active, setActive] = useState(0);

    const wrapRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const debounced = useDebouncedValue(term.trim(), 250);
    const hasTerm = debounced.length >= 2;

    /* The typeahead endpoints sit behind auth; the library search doesn't,
       so signed out the term goes there instead of nowhere. */
    const { user } = useAuth();
    const enabled = hasTerm && !!user;

    const { data: games, isFetching: gamesFetching } = useQuery({
        queryKey: queryKeys.games.search(debounced),
        queryFn: () => searchGames(debounced, PER_SECTION),
        enabled,
        staleTime: 30_000,
    });

    const { data: people, isFetching: peopleFetching } = useQuery({
        queryKey: queryKeys.profiles.search(debounced),
        queryFn: () => searchProfiles(debounced),
        enabled,
        staleTime: 30_000,
    });

    useEffect(() => {
        if (isOverlay) inputRef.current?.focus();
    }, [isOverlay]);

    /* "/" focuses the field, as the chip in it advertises. */
    useEffect(() => {
        if (isOverlay) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== "/" || event.metaKey || event.ctrlKey) return;
            const target = event.target as HTMLElement | null;
            const tag = target?.tagName;
            if (
                tag === "INPUT" ||
                tag === "TEXTAREA" ||
                target?.isContentEditable
            ) {
                return;
            }
            event.preventDefault();
            inputRef.current?.focus();
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [isOverlay]);

    useEffect(() => {
        if (!open || isOverlay) return;
        const onPointerDown = (event: MouseEvent) => {
            if (!wrapRef.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", onPointerDown);
        return () => document.removeEventListener("mousedown", onPointerDown);
    }, [open, isOverlay]);

    /* The previous term's results stay on screen while the new request is out,
       so "nothing found" has to wait for the request, not an empty list. */
    const searching = gamesFetching || peopleFetching;

    const gameRows = (games?.data ?? []).slice(0, PER_SECTION);
    const peopleRows = (people?.data ?? []).slice(0, PER_SECTION);

    const rows: Row[] = [
        ...gameRows.map((game) => ({
            key: `game-${game.id}`,
            to: `/game/${game.id}`,
            render: () => (
                <>
                    <GameCover
                        coverUrl={game.coverUrl}
                        title={game.title}
                        className="aspect-3/4 w-6 shrink-0 overflow-hidden rounded-xs"
                    />
                    <span className="min-w-0 flex-1 truncate">
                        {game.title}
                    </span>
                    <span className="shrink-0 font-mono text-label-sm text-content-muted">
                        {releaseYear(game.releaseDate)}
                    </span>
                </>
            ),
        })),
        ...peopleRows.map((profile) => ({
            key: `user-${profile.id}`,
            to: `/user/${profile.username}`,
            render: () => (
                <>
                    <ProfilePicture
                        variant="nav"
                        username={profile.username}
                        file={profile.avatarUrl ?? ""}
                        link={false}
                    />
                    <span className="min-w-0 flex-1 truncate">
                        {profile.username}
                    </span>
                </>
            ),
        })),
    ];

    const go = (to: string) => {
        if (!isOverlay) setOpen(false);
        setTerm("");
        navigate(to);
        onClose?.();
    };

    const onKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === "Escape") {
            if (isOverlay) return onClose?.();
            return setOpen(false);
        }
        if (!open || rows.length === 0) {
            // Enter with nothing highlighted still runs a library search.
            if (event.key === "Enter" && term.trim()) {
                event.preventDefault();
                go(`/library?q=${encodeURIComponent(term.trim())}`);
            }
            return;
        }

        switch (event.key) {
            case "ArrowDown":
                event.preventDefault();
                return setActive((i) => Math.min(rows.length - 1, i + 1));
            case "ArrowUp":
                event.preventDefault();
                return setActive((i) => Math.max(0, i - 1));
            case "Enter": {
                event.preventDefault();
                const row = rows[active];
                return go(
                    row?.to ?? `/library?q=${encodeURIComponent(term.trim())}`
                );
            }
        }
    };

    const Section = ({
        title,
        from,
        items,
    }: {
        title: string;
        from: number;
        items: Row[];
    }) =>
        items.length === 0 ? null : (
            <li>
                <p className="px-2.5 pt-2 pb-1 text-label text-content-muted">
                    {title}
                </p>
                <ul>
                    {items.map((row, i) => (
                        <li key={row.key}>
                            <button
                                type="button"
                                onMouseEnter={() => setActive(from + i)}
                                onClick={() => go(row.to)}
                                className={cn(
                                    "flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-sm px-2.5 py-2 text-left text-body-sm transition-colors sm:min-h-0",
                                    from + i === active
                                        ? "bg-surface-hover text-content"
                                        : "text-content-secondary"
                                )}
                            >
                                {row.render()}
                            </button>
                        </li>
                    ))}
                </ul>
            </li>
        );

    const field = (
        <form
            onSubmit={(event) => {
                event.preventDefault();
                if (term.trim()) {
                    go(`/library?q=${encodeURIComponent(term.trim())}`);
                }
            }}
            className={cn(
                "flex items-center gap-2.5 rounded-sm border border-subtle bg-surface-raised lift focus-within:border-brand focus-within:shadow-glow hover:border-strong",
                isOverlay ? "px-3.5 py-3" : "px-3 py-2"
            )}
        >
            <Search
                size={isOverlay ? 16 : 13}
                aria-hidden
                className="shrink-0 text-content-muted"
            />
            <input
                ref={inputRef}
                value={term}
                onChange={(e) => {
                    setTerm(e.target.value);
                    setActive(0);
                    setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onKeyDown={onKeyDown}
                aria-label="Search games and people"
                placeholder={
                    isOverlay ? "Games and people" : "Search games and people"
                }
                className="min-w-0 flex-1 bg-transparent text-base text-content placeholder:text-content-muted focus:outline-none sm:text-body-sm"
            />
            {searching ? (
                <LoaderCircle
                    size={isOverlay ? 16 : 13}
                    aria-hidden
                    className="shrink-0 animate-spin text-content-muted"
                />
            ) : (
                !isOverlay && (
                    <kbd className="rounded-xs border border-subtle px-1.5 font-mono text-[10px] text-content-muted">
                        /
                    </kbd>
                )
            )}
        </form>
    );

    const libraryLink = (
        <li>
            <button
                type="button"
                onClick={() =>
                    go(`/library?q=${encodeURIComponent(debounced)}`)
                }
                className="flex min-h-11 w-full cursor-pointer items-center rounded-sm px-2.5 py-2 text-left text-label text-brand hover:bg-surface-hover sm:min-h-0"
            >
                Search the library for “{debounced}”
            </button>
        </li>
    );

    const results = !user ? (
        libraryLink
    ) : (
        <>
            <Section
                title="Games"
                from={0}
                items={rows.slice(0, gameRows.length)}
            />
            <Section
                title="People"
                from={gameRows.length}
                items={rows.slice(gameRows.length)}
            />

            {searching && rows.length === 0 ? (
                <li className="flex items-center gap-2 px-2.5 py-3 text-body-sm text-content-muted">
                    <LoaderCircle
                        size={14}
                        aria-hidden
                        className="animate-spin"
                    />
                    Searching…
                </li>
            ) : rows.length === 0 ? (
                <li className="px-2.5 py-3 text-body-sm text-content-muted">
                    Nothing found for “{debounced}”.
                </li>
            ) : (
                <li className="mt-1 border-t border-subtle pt-1">
                    <button
                        type="button"
                        onClick={() =>
                            go(`/library?q=${encodeURIComponent(debounced)}`)
                        }
                        className="w-full cursor-pointer rounded-sm px-2.5 py-2 text-left text-label text-brand hover:bg-surface-hover"
                    >
                        See all games matching “{debounced}”
                    </button>
                </li>
            )}
        </>
    );

    if (isOverlay) {
        return (
            <div ref={wrapRef} className="flex min-h-0 flex-1 flex-col gap-3">
                {field}
                {hasTerm ? (
                    <ul className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
                        {results}
                    </ul>
                ) : (
                    <p className="px-2.5 py-3 text-body-sm text-content-muted">
                        Type at least two characters to search the catalogue.
                    </p>
                )}
            </div>
        );
    }

    return (
        <div ref={wrapRef} className="relative hidden xl:block xl:w-72">
            {field}

            {open && hasTerm && (
                <ul className="absolute top-[calc(100%+0.4rem)] right-0 left-0 z-40 max-h-96 animate-settle overflow-y-auto rounded-md border border-subtle bg-surface-raised p-1 shadow-modal">
                    {results}
                </ul>
            )}
        </div>
    );
};

export default GlobalSearch;
