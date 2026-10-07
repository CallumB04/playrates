import { useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { ReviewSort } from "@playrates/shared";
import { useAuth } from "../../contexts/AuthContext";
import { useAccountForm } from "../../contexts/AccountFormContext";
import {
    useGame,
    useGameStats,
    useGenres,
    usePlatformSystems,
    usePlatforms,
} from "../../hooks/queries/useGames";
import {
    useMyGameLogIds,
    useMyLogBundle,
    useQuickAdd,
} from "../../hooks/queries/useGameLogs";
import { useLogFlow } from "../../components/gamelog/useLogFlow";
import { remainingSystems, systemsForGame } from "../../lib/gameSystems";
import { useGameReviews } from "../../hooks/queries/useReviews";
import { usePageMeta } from "../../hooks/usePageMeta";
import { gameDescription, gamePageName } from "@playrates/shared";
import EmptyPlate from "../../components/ui/EmptyPlate";
import { TextSkeleton } from "../../components/ui/Skeleton";
import GameCoverPlate from "./components/GameCoverPlate";
import { useReviewVote } from "../../hooks/queries/useReviews";
import RatingPlate from "./components/RatingPlate";
import CirculationPlate from "./components/CirculationPlate";
import GameReviews from "./components/GameReviews";
import GameThreads from "./components/GameThreads";
import { useThreads } from "../../hooks/queries/useCommunity";
import { newThreadPath } from "../../components/community/paths";
import { buildGameFacts } from "./lib/gameFacts";
import GameBackdrop from "./components/GameBackdrop";
import StickyLogBar from "./components/StickyLogBar";
import { cn } from "../../lib/cn";
import ScoreCards from "./components/ScoreCards";
import RelatedGames from "./components/RelatedGames";
import ExpandableText from "./components/ExpandableText";

const GamePage = () => {
    const { gameID } = useParams();
    const gameId = Number(gameID);
    const { user } = useAuth();
    const { openLogin } = useAccountForm();
    const flow = useLogFlow();
    const quickAdd = useQuickAdd();
    const [quickSaving, setQuickSaving] = useState(false);

    const [sort, setSort] = useState<ReviewSort>("recent");
    const vote = useReviewVote();

    const { data: game, isLoading, isError } = useGame(gameId);
    const { data: stats } = useGameStats(gameId);
    const { data: platforms } = usePlatforms();
    const { data: genres } = useGenres();
    const { data: systems } = usePlatformSystems();
    const { data: myLogIds } = useMyGameLogIds();
    const { data: reviews, isLoading: reviewsLoading } = useGameReviews(
        gameId,
        sort
    );
    const navigate = useNavigate();
    const { data: threads, isLoading: threadsLoading } = useThreads(
        { gameId, limit: 5 },
        gameId > 0
    );

    usePageMeta({
        title: game ? gamePageName(game) : null,
        description: game
            ? gameDescription({
                  ...game,
                  platforms: game.platforms.map(
                      (slug) =>
                          platforms?.find((p) => p.slug === slug)
                              ?.displayName ?? slug
                  ),
              })
            : null,
        image: game?.coverUrl,
    });

    const actionsEnd = useRef<HTMLSpanElement>(null);
    const log = useMemo(
        () => (myLogIds ?? []).find((entry) => entry.gameId === gameId),
        [myLogIds, gameId]
    );

    const logCount = log?.logs.length ?? 0;
    // In full only once there are two to add up.
    const { data: bundle } = useMyLogBundle(gameId, logCount > 1);
    const canAddPlatform =
        !!log &&
        remainingSystems(
            systemsForGame(systems ?? [], game?.systems ?? []),
            log.logs.map((l) => l.system)
        ).length > 0;

    const facts = useMemo(
        () =>
            game ? buildGameFacts(game, platforms ?? [], genres ?? []) : null,
        [game, platforms, genres]
    );

    const quickLog = async (status: "backlog" | "wishlist") => {
        if (!game) return;
        setQuickSaving(true);
        // quickAdd says how it went itself
        await quickAdd(gameId, game.title, status).catch(() => undefined);
        setQuickSaving(false);
    };
    const openLog = () => (user ? flow.open(gameId) : openLogin());

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
                title="Game not found"
                body="The link may be out of date, or the game may have been removed."
            />
        );
    }

    return (
        <article
            className={cn(
                // max-sm:pb-20: room at the very bottom for the sticky bar
                "flex flex-col gap-7 max-sm:pb-20",
                // room for the banner to be seen before the page starts
                game.artworkUrl && "pt-16 sm:pt-28 lg:pt-32"
            )}
        >
            <GameBackdrop url={game.artworkUrl} />
            <StickyLogBar
                anchor={actionsEnd}
                label={
                    logCount > 1
                        ? `Your logs · ${logCount}`
                        : log
                          ? "Edit your log"
                          : user
                            ? "Log this game"
                            : "Log in to add"
                }
                onPress={openLog}
                disabled={quickSaving}
            />
            {/* auto then 1fr: when the cover column is the taller, the spare
                height goes below the description, not between it and the
                title. */}
            <div className="grid items-start gap-x-10 gap-y-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:gap-y-8">
                <div className="min-w-0 lg:col-start-1 lg:row-span-2 lg:row-start-1">
                    <GameCoverPlate
                        game={game}
                        log={log}
                        isSignedIn={!!user}
                        facts={facts}
                        onViewLog={() => flow.view(gameId)}
                        onPrimary={openLog}
                        bundle={bundle}
                        canAdd={canAddPlatform}
                        onAddPlatform={() => flow.add(gameId)}
                        onEditLog={(logId) => flow.edit(gameId, logId)}
                        onQuickLog={(status) => void quickLog(status)}
                        isSaving={quickSaving}
                        actionsEndRef={actionsEnd}
                    />
                </div>

                <header className="order-first min-w-0 lg:order-none lg:col-start-2 lg:row-start-1">
                    <h1 className="font-display text-display text-content">
                        {game.title}
                    </h1>
                </header>

                <div className="flex min-w-0 flex-col gap-6 lg:col-start-2 lg:row-start-2">
                    {game.description ? (
                        <ExpandableText
                            text={game.description}
                            className="text-body"
                            moreLabel="Read the full description"
                        />
                    ) : (
                        <p className="rounded-md border border-dashed border-strong bg-surface-sunken/60 px-4 py-3 text-body-sm text-content-muted">
                            No description on record for this one yet.
                        </p>
                    )}

                    <ScoreCards game={game} stats={stats} />

                    {/* Only once there's something in them. Most games have
                        no logs yet, and an empty chart and four bars at zero
                        repeat what "0 logs" above already says. */}
                    {stats && stats.ratingCount > 0 && (
                        <RatingPlate
                            average={stats.averageRating}
                            ratingCount={stats.ratingCount}
                            buckets={stats.ratingBuckets}
                        />
                    )}
                    {stats && stats.logCount > 0 && (
                        <CirculationPlate
                            byStatus={stats.byStatus}
                            byPlayedStatus={stats.byPlayedStatus}
                            logCount={stats.logCount}
                        />
                    )}

                    <GameReviews
                        reviews={reviews?.data ?? []}
                        logCount={logCount}
                        onWriteReview={
                            user ? () => flow.review(gameId) : () => openLogin()
                        }
                        viewerId={user?.id}
                        onVote={(reviewId) => vote.mutateAsync(reviewId)}
                        total={reviews?.meta.total ?? 0}
                        sort={sort}
                        onSortChange={setSort}
                        isLoading={reviewsLoading}
                    />

                    <GameThreads
                        gameId={gameId}
                        threads={threads?.data ?? []}
                        total={threads?.meta.total ?? 0}
                        isLoading={threadsLoading}
                        onStart={() =>
                            user ? navigate(newThreadPath(gameId)) : openLogin()
                        }
                    />
                </div>
            </div>

            <RelatedGames gameId={gameId} platforms={platforms ?? []} />
        </article>
    );
};

export default GamePage;
