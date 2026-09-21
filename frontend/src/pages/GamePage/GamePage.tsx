import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import type { ReviewSort } from "@playrates/shared";
import type { GameLogWithGame } from "../../api";
import { useAuth } from "../../contexts/AuthContext";
import { useAccountForm } from "../../contexts/AccountFormContext";
import { useNotify } from "../../contexts/NotificationContext";
import {
    useGame,
    useGameStats,
    useGenres,
    usePlatforms,
} from "../../hooks/queries/useGames";
import {
    useGameLogMutations,
    useMyGameLogIds,
    useMyGameLogs,
} from "../../hooks/queries/useGameLogs";
import { useGameReviews } from "../../hooks/queries/useReviews";
import CreateOrEditGameLogPopup from "../../components/CreateOrEditGameLogPopup";
import EmptyPlate from "../../components/ui/EmptyPlate";
import { TextSkeleton } from "../../components/ui/Skeleton";
import GameCoverPlate from "./components/GameCoverPlate";
import RatingPlate from "./components/RatingPlate";
import CirculationPlate from "./components/CirculationPlate";
import PlayerNotes from "./components/PlayerNotes";
import { buildExternalFacts, buildGameFacts } from "./lib/gameFacts";

const GamePage = () => {
    const { gameID } = useParams();
    const gameId = Number(gameID);
    const { user } = useAuth();
    const { openLogin } = useAccountForm();
    const notify = useNotify();

    const [sort, setSort] = useState<ReviewSort>("recent");
    const [editing, setEditing] = useState(false);

    const { data: game, isLoading, isError } = useGame(gameId);
    const { data: stats } = useGameStats(gameId);
    const { data: platforms } = usePlatforms();
    const { data: genres } = useGenres();
    const { data: myLogIds } = useMyGameLogIds();
    const { data: reviews, isLoading: reviewsLoading } = useGameReviews(
        gameId,
        sort
    );
    const { save } = useGameLogMutations();

    const log = useMemo(
        () => (myLogIds ?? []).find((entry) => entry.gameId === gameId),
        [myLogIds, gameId]
    );

    /* Only needed once the editor opens, so it rides along with the list the
       page already holds rather than adding a request per view. */
    const { data: myLogs } = useMyGameLogs(undefined, { limit: 100 });
    const fullLog: GameLogWithGame | undefined = (myLogs?.data ?? []).find(
        (entry) => entry.gameId === gameId
    );

    const externalFacts = useMemo(
        () => (game ? buildExternalFacts(game) : []),
        [game]
    );

    const facts = useMemo(
        () => (game ? buildGameFacts(game, platforms ?? [], genres ?? []) : []),
        [game, platforms, genres]
    );

    const quickLog = async (status: "backlog" | "wishlist") => {
        if (!game) return;
        try {
            await save.mutateAsync({ gameId, input: { status } });
            notify(`${game.title} moved to your ${status}`, "success");
        } catch {
            notify("Couldn't update your shelf", "error");
        }
    };

    if (isLoading) {
        return (
            <div className="grid gap-10 lg:grid-cols-[300px_minmax(0,1fr)]">
                <div className="aspect-3/4 bg-surface-sunken" />
                <TextSkeleton lines={6} />
            </div>
        );
    }

    if (isError || !game) {
        return (
            <EmptyPlate
                title="That game isn't in the catalogue"
                body="The link may be wrong, or the title may have been removed since it was shared."
            />
        );
    }

    return (
        <article className="flex flex-col gap-7">
            <div className="grid items-start gap-x-10 gap-y-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-y-8">
                <div className="lg:col-start-1 lg:row-span-2 lg:row-start-1">
                    <GameCoverPlate
                        game={game}
                        log={log}
                        isSignedIn={!!user}
                        facts={facts}
                        onPrimary={() =>
                            user ? setEditing(true) : openLogin()
                        }
                        onQuickLog={(status) => void quickLog(status)}
                        isSaving={save.isPending}
                    />
                </div>

                <header className="order-first min-w-0 lg:order-none lg:col-start-2 lg:row-start-1">
                    <h1 className="font-display text-display text-content">
                        {game.title}
                    </h1>
                </header>

                <div className="flex min-w-0 flex-col gap-6 lg:col-start-2 lg:row-start-2">
                    {game.description ? (
                        <p className="max-w-[52ch] text-body text-content-secondary">
                            {game.description}
                        </p>
                    ) : (
                        <p className="max-w-[52ch] rounded-md border border-dashed border-strong bg-surface-sunken/60 px-4 py-3 text-body-sm text-content-muted">
                            No description on record for this one yet.
                        </p>
                    )}

                    {stats && (
                        <>
                            <RatingPlate
                                average={stats.averageRating}
                                ratingCount={stats.ratingCount}
                                buckets={stats.ratingBuckets}
                            />
                            <CirculationPlate
                                byStatus={stats.byStatus}
                                logCount={stats.logCount}
                            />
                        </>
                    )}

                    {externalFacts.length > 0 && (
                        /* Somebody else's numbers, named as such and kept
                           below this site's own so a 4.3/5 is never read as a
                           PlayRates rating. */
                        <section className="flex flex-wrap gap-x-8 gap-y-3 rounded-md border border-subtle bg-surface-sunken/40 px-4 py-3">
                            <h2 className="w-full text-label text-content-muted">
                                Elsewhere
                            </h2>
                            {externalFacts.map((fact) => (
                                <div key={fact.label}>
                                    <p className="font-mono text-figure-sm text-content">
                                        {fact.value}
                                    </p>
                                    <p className="text-label-sm text-content-muted">
                                        {fact.label}
                                    </p>
                                </div>
                            ))}
                        </section>
                    )}

                    <PlayerNotes
                        reviews={reviews?.data ?? []}
                        total={reviews?.meta.total ?? 0}
                        sort={sort}
                        onSortChange={setSort}
                        isLoading={reviewsLoading}
                    />
                </div>
            </div>

            {editing && (
                <CreateOrEditGameLogPopup
                    closePopup={() => setEditing(false)}
                    viewUpdatedLog={() => setEditing(false)}
                    gamelog={fullLog ?? null}
                    gameID={gameId}
                    editing={!!fullLog}
                />
            )}
        </article>
    );
};

export default GamePage;
