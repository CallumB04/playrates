import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { LoaderCircle, Search } from "lucide-react";
import { queryKeys, searchGames, searchProfiles } from "../../api";
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

/**
 * Search across the site, not just titles.
 *
 * The field used to submit to the library with whatever was typed, which
 * meant finding a person was impossible from the one search box on the page.
 * Games and people are separate sections because they are answers to
 * different questions, and mixing them into one ranked list buries whichever
 * kind you were not thinking of.
 */
const GlobalSearch = () => {
    const navigate = useNavigate();
    const [term, setTerm] = useState("");
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);

    const wrapRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const debounced = useDebouncedValue(term.trim(), 250);
    const enabled = debounced.length >= 2;

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

    /* "/" focuses the field, as the chip in it advertises. */
    useEffect(() => {
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
    }, []);

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (event: MouseEvent) => {
            if (!wrapRef.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", onPointerDown);
        return () => document.removeEventListener("mousedown", onPointerDown);
    }, [open]);

    /* Typing past the debounce leaves the previous term's results on screen
       while the new request is out, so "nothing found" has to wait for the
       request rather than for the list to be empty. */
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
        setOpen(false);
        setTerm("");
        navigate(to);
    };

    const onKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === "Escape") return setOpen(false);
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
                <p className="px-2.5 pb-1 pt-2 text-label text-content-muted">
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
                                    "flex w-full cursor-pointer items-center gap-2.5 rounded-sm px-2.5 py-2 text-left text-body-sm transition-colors",
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

    return (
        <div ref={wrapRef} className="relative hidden xl:block xl:w-72">
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    if (term.trim()) {
                        go(`/library?q=${encodeURIComponent(term.trim())}`);
                    }
                }}
                className="lift flex items-center gap-2.5 rounded-sm border border-subtle bg-surface-raised px-3 py-2 hover:border-strong focus-within:border-brand focus-within:shadow-glow"
            >
                <Search
                    size={13}
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
                    placeholder="Search games and people"
                    className="min-w-0 flex-1 bg-transparent text-body-sm text-content placeholder:text-content-muted focus:outline-none"
                />
                {searching ? (
                    <LoaderCircle
                        size={13}
                        aria-hidden
                        className="shrink-0 animate-spin text-content-muted"
                    />
                ) : (
                    <kbd className="rounded-xs border border-subtle px-1.5 font-mono text-[10px] text-content-muted">
                        /
                    </kbd>
                )}
            </form>

            {open && enabled && (
                <ul className="animate-settle absolute left-0 right-0 top-[calc(100%+0.4rem)] z-40 max-h-96 overflow-y-auto rounded-md border border-subtle bg-surface-raised p-1 shadow-modal">
                    <Section title="Games" from={0} items={rows.slice(0, gameRows.length)} />
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
                                    go(
                                        `/library?q=${encodeURIComponent(debounced)}`
                                    )
                                }
                                className="w-full cursor-pointer rounded-sm px-2.5 py-2 text-left text-label text-brand hover:bg-surface-hover"
                            >
                                See all games matching “{debounced}”
                            </button>
                        </li>
                    )}
                </ul>
            )}
        </div>
    );
};

export default GlobalSearch;
