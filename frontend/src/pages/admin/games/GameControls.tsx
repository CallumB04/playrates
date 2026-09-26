import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import type { AdminGameSummary } from "@playrates/shared";
import { cardClass } from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import Toggle from "../../../components/ui/Toggle";
import Field from "../../../components/ui/Field";
import { NumberInput, SearchInput } from "../../../components/ui/Input";
import GameCover from "../../../components/game/GameCover";
import { useNotify } from "../../../contexts/NotificationContext";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import {
    useAdminGameSearch,
    useImportGame,
    useResyncGame,
    useSetTrending,
} from "../../../hooks/queries/useAdmin";
import { cn } from "../../../lib/cn";
import { formatCount, releaseYear, relativeTime } from "../../../lib/format";

const GameRow = ({ game }: { game: AdminGameSummary }) => {
    const notify = useNotify();
    const trending = useSetTrending();
    const resync = useResyncGame();

    return (
        <li className="flex flex-col gap-3 border-b border-subtle py-3 last:border-b-0 sm:flex-row sm:items-center sm:gap-5">
            <Link to={`/game/${game.id}`} className="group flex min-w-0 flex-1 items-center gap-3">
                <GameCover
                    coverUrl={game.coverUrl}
                    title={game.title}
                    className="aspect-3/4 w-10 shrink-0 overflow-hidden rounded-xs shadow-cover"
                />
                <span className="min-w-0">
                    <span className="block truncate text-body-sm font-medium text-content group-hover:text-brand">
                        {game.title}
                    </span>
                    <span className="mt-0.5 block truncate text-label-sm text-content-muted">
                        <span className="font-mono">{releaseYear(game.releaseDate)}</span> ·{" "}
                        <span className="font-mono">{formatCount(game.logCount)}</span>{" "}
                        {game.logCount === 1 ? "log" : "logs"} ·{" "}
                        {game.detailsSyncedAt
                            ? `details from ${relativeTime(game.detailsSyncedAt)}`
                            : "details never fetched"}
                    </span>
                </span>
            </Link>
            <div className="flex items-center justify-between gap-5 pl-13 sm:justify-end sm:pl-0">
                <Toggle
                    checked={game.isTrending}
                    onChange={(isTrending) =>
                        trending.mutate(
                            { id: game.id, isTrending },
                            {
                                onSuccess: () =>
                                    notify(isTrending ? `${game.title} is trending` : `${game.title} is off the rail`, "success"),
                                onError: () => notify("That didn’t save", "error"),
                            }
                        )
                    }
                    disabled={trending.isPending}
                    label="Trending"
                />
                <Button
                    variant="secondary"
                    size="sm"
                    disabled={resync.isPending || game.rawgId === null}
                    title={game.rawgId === null ? "This one didn’t come from RAWG" : undefined}
                    onClick={() =>
                        resync.mutate(game.id, {
                            onSuccess: () => notify(`${game.title} is up to date`, "success"),
                            onError: (error) => notify(error.message, "error"),
                        })
                    }
                >
                    {resync.isPending ? "Fetching…" : "Fetch details"}
                </Button>
            </div>
        </li>
    );
};

/** Find a game already here and look after it, or bring one in by its id. */
const GameControls = () => {
    const [query, setQuery] = useState("");
    const q = useDebouncedValue(query.trim(), 250);
    const { data: games, isFetching } = useAdminGameSearch(q);

    const [rawgId, setRawgId] = useState("");
    const importGame = useImportGame();
    const notify = useNotify();

    const submitImport = (e: FormEvent) => {
        e.preventDefault();
        const id = Number(rawgId);
        if (!Number.isInteger(id) || id <= 0) return;
        importGame.mutate(id, {
            onSuccess: ({ game, created }) => {
                notify(created ? `${game.title} is in the catalogue` : `${game.title} was already here`, "success");
                setRawgId("");
                setQuery(game.title);
            },
            onError: (error) => notify(error.message, "error"),
        });
    };

    return (
        <section aria-labelledby="look-after-heading" className={cardClass("flex flex-col")}>
            <h2 id="look-after-heading" className="text-label text-content-muted">
                Look after a game
            </h2>
            <div className="relative mt-3">
                <Search
                    size={15}
                    aria-hidden
                    className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-content-muted"
                />
                <SearchInput
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Find a game here by name"
                    aria-label="Find a game here by name"
                />
            </div>

            {q.length >= 2 && games && (
                <ul className={cn("mt-2 flex flex-col transition-opacity", isFetching && "opacity-60")}>
                    {games.length === 0 ? (
                        <li className="py-3 text-body-sm text-content-muted">
                            Nothing called that here. If RAWG has it, bring it in by its id.
                        </li>
                    ) : (
                        games.slice(0, 5).map((game) => <GameRow key={game.id} game={game} />)
                    )}
                </ul>
            )}

            <form onSubmit={submitImport} className="mt-5 flex flex-col gap-2 border-t border-subtle pt-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <Field label="Bring one in by its RAWG id" className="sm:max-w-xs sm:flex-1">
                        {(a11y) => (
                            <NumberInput
                                {...a11y}
                                value={rawgId}
                                onChange={(e) => setRawgId(e.target.value)}
                                min={1}
                                step={1}
                                inputMode="numeric"
                                placeholder="1011283"
                            />
                        )}
                    </Field>
                    <Button
                        type="submit"
                        variant="secondary"
                        disabled={importGame.isPending || rawgId === ""}
                        className="w-full sm:w-auto"
                    >
                        {importGame.isPending ? "Importing…" : "Import"}
                    </Button>
                </div>
                <p className="text-label-sm text-content-muted">Costs two or three RAWG requests.</p>
            </form>
        </section>
    );
};

export default GameControls;
