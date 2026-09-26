import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { RefreshCw, Search } from "lucide-react";
import type { AdminGameSummary } from "@playrates/shared";
import Panel from "../../../components/ui/Panel";
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
import { formatCount, formatDate, relativeTime } from "../../../lib/format";

const GameRow = ({ game }: { game: AdminGameSummary }) => {
    const notify = useNotify();
    const trending = useSetTrending();
    const resync = useResyncGame();

    return (
        <li className="flex flex-col gap-3 rounded-md border border-subtle bg-surface-raised p-3 sm:flex-row sm:items-center">
            <Link to={`/game/${game.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <GameCover coverUrl={game.coverUrl} title={game.title} className="w-9 shrink-0 rounded-xs" />
                <span className="min-w-0">
                    <span className="block truncate text-body-sm font-medium text-content">
                        {game.title}
                    </span>
                    <span className="block text-label-sm text-content-muted">
                        {game.releaseDate ? formatDate(game.releaseDate) : "No release date"} ·{" "}
                        {formatCount(game.logCount)} logs ·{" "}
                        {game.detailsSyncedAt
                            ? `details ${relativeTime(game.detailsSyncedAt)}`
                            : "details never fetched"}
                    </span>
                </span>
            </Link>
            <div className="flex items-center justify-between gap-4 sm:justify-end">
                <Toggle
                    checked={game.isTrending}
                    onChange={(isTrending) =>
                        trending.mutate(
                            { id: game.id, isTrending },
                            { onError: () => notify("Couldn't change trending", "error") }
                        )
                    }
                    disabled={trending.isPending}
                    label="Trending"
                />
                <Button
                    variant="secondary"
                    size="sm"
                    disabled={resync.isPending || game.rawgId === null}
                    title={game.rawgId === null ? "Not from RAWG" : undefined}
                    onClick={() =>
                        resync.mutate(game.id, {
                            onSuccess: () => notify(`Re-synced ${game.title}`, "success"),
                            onError: (error) => notify(error.message, "error"),
                        })
                    }
                >
                    <RefreshCw
                        size={14}
                        aria-hidden
                        className={resync.isPending ? "animate-spin" : undefined}
                    />
                    Re-sync
                </Button>
            </div>
        </li>
    );
};

/** Find a game already here and look after it; or bring one in by its id. */
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
                notify(created ? `Imported ${game.title}` : `${game.title} was already here`, "success");
                setRawgId("");
                setQuery(game.title);
            },
            onError: (error) => notify(error.message, "error"),
        });
    };

    return (
        <Panel title="Look after a game">
            <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-3">
                    <div className="relative">
                        <Search
                            size={15}
                            aria-hidden
                            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-content-muted"
                        />
                        <SearchInput
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Find a game in the catalogue"
                            aria-label="Find a game in the catalogue"
                        />
                    </div>
                    {q.length >= 2 && games && (
                        <ul className={isFetching ? "flex flex-col gap-2 opacity-60" : "flex flex-col gap-2"}>
                            {games.length === 0 ? (
                                <li className="text-body-sm text-content-muted">
                                    Nothing called that here. Import it by its RAWG id below.
                                </li>
                            ) : (
                                games.map((game) => <GameRow key={game.id} game={game} />)
                            )}
                        </ul>
                    )}
                </div>

                <form onSubmit={submitImport} className="flex flex-col gap-2 border-t border-subtle pt-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                        <Field label="Import by RAWG id" className="sm:flex-1">
                            {(a11y) => (
                                <NumberInput
                                    {...a11y}
                                    value={rawgId}
                                    onChange={(e) => setRawgId(e.target.value)}
                                    min={1}
                                    step={1}
                                    inputMode="numeric"
                                    placeholder="e.g. 1011283"
                                />
                            )}
                        </Field>
                        <Button
                            type="submit"
                            variant="secondary"
                            disabled={importGame.isPending || rawgId === ""}
                            className="w-full sm:w-auto"
                        >
                            Import
                        </Button>
                    </div>
                    <p className="text-label-sm text-content-muted">
                        The number in a rawg.io game&rsquo;s API entry. Costs two or three requests.
                    </p>
                </form>
            </div>
        </Panel>
    );
};

export default GameControls;
