import { useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useSteamAvailable } from "../steam/useSteamAvailable";
import { Check } from "lucide-react";
import Button from "../ui/Button";
import { Skeleton } from "../ui/Skeleton";
import GameCover from "../game/GameCover";
import LoadingSpinner from "../LoadingSpinner";
import { queryKeys, type GameListFilters } from "../../api";
import { useCatalogueReach, useGames } from "../../hooks/queries/useGames";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { Input } from "../ui/Input";
import { useLogMutations } from "../../hooks/queries/useGameLogs";
import { useNotify } from "../../contexts/NotificationContext";
import { formatCount } from "../../lib/format";
import { cn } from "../../lib/cn";

const SHOWN = 12;

/** One or two letters match too much to be worth asking about. */
const searchOf = (typed: string): string | undefined =>
    typed.length >= 2 ? typed : undefined;

const filtersFor = (typed: string): GameListFilters => ({
    sort: "logged",
    limit: SHOWN,
    count: false,
    search: searchOf(typed),
});

interface PlayedGamesStepProps {
    titleId: string;
    /** Walks it without logging a thing, for the admin preview. */
    preview?: boolean;
    onDone: () => void;
}

/**
 * The welcome's second step: the games most logged here, to tap the ones
 * already played. An empty shelf is the hardest place to start, and these
 * are the likeliest to have been played.
 */
const PlayedGamesStep = ({
    titleId,
    preview = false,
    onDone,
}: PlayedGamesStepProps) => {
    /* The most logged to start with; a search for anything else. A pick
       stays picked as the search changes. */
    const [search, setSearch] = useState("");
    const typed = search.trim();
    const settled = useDebouncedValue(typed, 250);
    const queryClient = useQueryClient();
    // A search already made shows at once; only a new one waits for a pause.
    const made = queryClient.getQueryData(
        queryKeys.games.list({ ...filtersFor(typed) })
    );
    const term = made ? typed : settled;
    const { data, isLoading, isFetching, isPlaceholderData } = useGames(
        filtersFor(term)
    );
    /* Until what's shown is what was typed, the last search's covers would
       sit there looking like the answer. */
    const waiting =
        isLoading || isPlaceholderData || searchOf(typed) !== searchOf(term);

    /* The catalogue is checked first. Only nothing, or near misses, look
       further, as the library does: the game may simply not be here yet. */
    const answer = !waiting && searchOf(term) ? data : undefined;
    const none = answer?.data.length === 0;
    const closest = !!answer?.meta.approximate;
    const { reaching, found } = useCatalogueReach(term, none || closest);
    // Until the list has been asked again for what was just added.
    const lookingFurther = reaching || (found > 0 && isFetching);
    const { create } = useLogMutations();
    const steamAvailable = useSteamAvailable();
    const notify = useNotify();
    const [picked, setPicked] = useState<number[]>([]);
    const [saving, setSaving] = useState(false);

    const toggle = (id: number) =>
        setPicked((p) =>
            p.includes(id) ? p.filter((x) => x !== id) : [...p, id]
        );

    const add = async () => {
        if (preview) return onDone();
        setSaving(true);
        const results = await Promise.allSettled(
            picked.map((gameId) =>
                create.mutateAsync({ gameId, status: "played" })
            )
        );
        setSaving(false);
        const failed = results.filter((r) => r.status === "rejected").length;
        if (failed > 0)
            notify(
                `${formatCount(failed)} of those didn’t save. Add them from their pages.`,
                "error"
            );
        onDone();
    };

    return (
        <div className="flex flex-col gap-5">
            <div className="pr-11 sm:pr-8">
                <h2
                    id={titleId}
                    className="font-display text-section text-content"
                >
                    Games you’ve played
                </h2>
                <p className="mt-1.5 text-body-sm text-content-secondary">
                    Tap any you’ve played to put them on your shelves. You can
                    rate them and add the rest later.
                </p>
            </div>

            <Input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search for a game"
                aria-label="Search for a game"
            />

            {steamAvailable && !preview && (
                <p className="text-body-sm text-content-secondary">
                    Got a Steam library?{" "}
                    <Link
                        to="/settings?section=content&import=steam"
                        onClick={onDone}
                        className="relative font-medium text-brand-text underline-offset-2 before:absolute before:-inset-x-1 before:-inset-y-3 before:content-[''] hover:underline"
                    >
                        Import it instead
                    </Link>
                </p>
            )}

            {none && lookingFurther && (
                <p
                    role="status"
                    className="flex items-center gap-2 text-body-sm text-content-secondary"
                >
                    <LoadingSpinner size="sm" label={null} />
                    Looking further for “{term}”…
                </p>
            )}

            {none && !lookingFurther && (
                <p className="text-body-sm text-content-secondary">
                    Nothing matches “{term}”.
                </p>
            )}

            {closest && (
                <p
                    role="status"
                    className="flex items-center gap-2 text-body-sm text-content-secondary"
                >
                    {lookingFurther && (
                        <LoadingSpinner size="sm" label="Searching" />
                    )}
                    Nothing is called “{term}”, so these are the closest titles.
                </p>
            )}

            <ul
                aria-busy={waiting}
                className="grid grid-cols-3 gap-2 sm:grid-cols-4"
            >
                {waiting
                    ? Array.from({ length: SHOWN }, (_, i) => (
                          <li key={i}>
                              <Skeleton className="aspect-3/4 rounded-xs" />
                          </li>
                      ))
                    : (data?.data ?? []).map((game) => {
                          const on = picked.includes(game.id);
                          return (
                              <li key={game.id}>
                                  <button
                                      type="button"
                                      aria-pressed={on}
                                      aria-label={game.title}
                                      onClick={() => toggle(game.id)}
                                      className={cn(
                                          "relative block w-full cursor-pointer overflow-hidden rounded-xs lift",
                                          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                                          on && "ring-2 ring-brand"
                                      )}
                                  >
                                      <GameCover
                                          coverUrl={game.coverUrl}
                                          title={game.title}
                                          className={cn(
                                              "aspect-3/4 w-full transition-opacity",
                                              on && "opacity-60"
                                          )}
                                      />
                                      {on && (
                                          <span
                                              aria-hidden
                                              className="absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full bg-brand text-content-on-solid"
                                          >
                                              <Check
                                                  size={14}
                                                  strokeWidth={3}
                                              />
                                          </span>
                                      )}
                                  </button>
                              </li>
                          );
                      })}
            </ul>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                    variant="ghost"
                    onClick={onDone}
                    disabled={saving}
                    className="w-full sm:w-auto"
                >
                    Skip for now
                </Button>
                <Button
                    onClick={() => void add()}
                    disabled={picked.length === 0 || saving}
                    className="w-full sm:w-auto"
                >
                    {saving
                        ? "Adding…"
                        : picked.length === 0
                          ? "Add to my shelves"
                          : `Add ${formatCount(picked.length)} ${picked.length === 1 ? "game" : "games"}`}
                </Button>
            </div>
        </div>
    );
};

export default PlayedGamesStep;
