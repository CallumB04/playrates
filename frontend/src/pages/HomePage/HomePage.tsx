import { useMemo, useState } from "react";
import type { Game } from "@playrates/shared";
import { formatCount, formatReleaseShort, releaseYear } from "../../lib/format";
import { useAuth } from "../../contexts/AuthContext";
import { useAccountForm } from "../../contexts/AccountFormContext";
import {
    useGames,
    useGenres,
    usePlatforms,
    useSiteStats,
} from "../../hooks/queries/useGames";
import {
    useMyGameLog,
    useMyGameLogIds,
    useMyGameLogs,
    useQuickAdd,
    useUserStats,
} from "../../hooks/queries/useGameLogs";
import { useFriendActivity } from "../../hooks/queries/useFriends";
import { useRecentReviews } from "../../hooks/queries/useReviews";
import { usePageTitle } from "../../hooks/usePageTitle";
import CreateOrEditGameLogPopup from "../../components/CreateOrEditGameLogPopup";
import ViewGameLogPopup from "../../components/ViewGameLogPopup";
import {
    STATUS_PRESENTATION,
    displayStatusFor,
} from "../../constants/gameStatus";
import type { TileAction } from "../../components/game/GameTile";
import SignedOutHero from "./components/SignedOutHero";
import ReEntryPlate from "./components/ReEntryPlate";
import Rail from "./components/Rail";
import GenreGrid from "./components/GenreGrid";
import FriendFeed from "./components/FriendFeed";
import ReviewFeed from "./components/ReviewFeed";

const RAIL_SIZE = 24;

/** The last 90 days, so "new releases" excludes unreleased TBA titles. */
const releaseWindow = () => {
    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - 90);
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    return { releasedAfter: iso(from), releasedBefore: iso(now) };
};

/** The home page only holds which games you have logged, not the logs
 *  themselves, so the one being opened is fetched as it opens. */
const LogViewer = ({
    gameId,
    username,
    onClose,
    onEdit,
}: {
    gameId: number;
    username: string;
    onClose: () => void;
    onEdit: () => void;
}) => {
    const { data: log } = useMyGameLog(gameId);
    if (!log) return null;

    return (
        <ViewGameLogPopup
            gamelog={log}
            ownerUsername={username}
            closePopup={onClose}
            primaryAction={{ label: "Edit", onSelect: onEdit }}
        />
    );
};

const HomePage = () => {
    /* No name of its own: the homepage keeps the site title. */
    usePageTitle();

    const { user } = useAuth();
    const { openSignup, openLogin } = useAccountForm();
    const [logging, setLogging] = useState<number | null>(null);
    const [viewing, setViewing] = useState<number | null>(null);

    const { data: siteStats } = useSiteStats();
    const { data: platforms } = usePlatforms();
    const { data: genres } = useGenres();

    const window = useMemo(releaseWindow, []);

    const { data: trending, isLoading: trendingLoading } = useGames({
        trending: true,
        limit: RAIL_SIZE,
    });
    const { data: popular, isLoading: popularLoading } = useGames({
        sort: "logged",
        limit: RAIL_SIZE,
    });
    const { data: fresh, isLoading: freshLoading } = useGames({
        sort: "released",
        limit: RAIL_SIZE,
        ...window,
    });
    const { data: acclaimed, isLoading: acclaimedLoading } = useGames({
        sort: "rating",
        limit: RAIL_SIZE,
    });

    const { data: activity, isLoading: activityLoading } = useFriendActivity(6);
    const { data: reviews, isLoading: reviewsLoading } = useRecentReviews(4);

    // meta.total, not the length of a page.
    const { data: playing } = useMyGameLogs("playing", { limit: 1 });
    const { data: backlog } = useMyGameLogs("backlog", { limit: 1 });
    // Enough to draw a year without paging. The chart is a shape, not a ledger.
    const { data: played } = useMyGameLogs("played", { limit: 100 });
    const { data: yearStats } = useUserStats(
        user?.username ?? "",
        new Date().getFullYear()
    );

    const current = playing?.data[0];

    // Ids only: the rails show whether you logged something, not what's in it.
    const { data: myLogIds } = useMyGameLogIds();
    const logByGameId = useMemo(
        () => new Map((myLogIds ?? []).map((log) => [log.gameId, log])),
        [myLogIds]
    );


    const quickAdd = useQuickAdd();

    // Every cover on the page can be logged from where it sits.
    const statusFor = (game: Game) => {
        const log = logByGameId.get(game.id);
        return log ? displayStatusFor(log.status, log.playedStatus) : null;
    };

    const actionsFor = (game: Game): TileAction[] => {
        if (!user) {
            return [
                {
                    key: "signin",
                    label: "Log in to add",
                    tone: "primary",
                    onSelect: openLogin,
                },
            ];
        }

        // Already logged, so "add to backlog" would overwrite the status.
        if (logByGameId.has(game.id)) {
            return [
                {
                    key: "view",
                    label: "View your log",
                    tone: "primary",
                    onSelect: () => setViewing(game.id),
                },
                {
                    key: "edit",
                    label: "Edit",
                    onSelect: () => setLogging(game.id),
                },
            ];
        }

        return [
            {
                key: "log",
                label: "Create log",
                tone: "primary",
                onSelect: () => setLogging(game.id),
            },
            {
                key: "backlog",
                label: "Add to backlog",
                icon: STATUS_PRESENTATION.backlog.icon,
                onSelect: () => quickAdd(game.id, game.title, "backlog"),
                doneLabel: "In your backlog",
            },
            {
                key: "wishlist",
                label: "Add to wishlist",
                icon: STATUS_PRESENTATION.wishlist.icon,
                onSelect: () => quickAdd(game.id, game.title, "wishlist"),
                doneLabel: "On your wishlist",
            },
        ];
    };

    return (
        <div className="flex flex-col gap-11">
            {user ? (
                <ReEntryPlate
                    username={user.username}
                    displayName={user.firstName || user.username}
                    current={current}
                    playingCount={playing?.meta.total ?? 0}
                    backlogCount={backlog?.meta.total ?? 0}
                    yearLogs={played?.data ?? []}
                    yearStats={yearStats}
                    onUpdateLog={() => current && setLogging(current.gameId)}
                />
            ) : (
                <SignedOutHero
                    siteStats={siteStats}
                    covers={trending?.data ?? []}
                    onStart={openSignup}
                />
            )}

            <Rail
                title="Trending"
                note="what people are playing most right now"
                games={trending?.data ?? []}
                platforms={platforms ?? []}
                isLoading={trendingLoading}
                actionsFor={actionsFor}
                statusFor={statusFor}
            />

            <Rail
                title="Most logged"
                note="all time, by PlayRates logs"
                games={popular?.data ?? []}
                platforms={platforms ?? []}
                isLoading={popularLoading}
                actionsFor={actionsFor}
                statusFor={statusFor}
                footValueFor={(game) =>
                    game.logCount > 0
                        ? `${formatCount(game.logCount)} ${
                              game.logCount === 1 ? "log" : "logs"
                          }`
                        : releaseYear(game.releaseDate)
                }
            />

            <Rail
                title="Highest rated"
                note="by the people who logged them"
                games={acclaimed?.data ?? []}
                platforms={platforms ?? []}
                isLoading={acclaimedLoading}
                actionsFor={actionsFor}
                statusFor={statusFor}
                ratingFor={(game) => game.avgRating ?? undefined}
            />

            <ReviewFeed
                reviews={reviews?.data ?? []}
                isLoading={reviewsLoading}
            />

            {user && (
                <FriendFeed
                    items={activity?.data ?? []}
                    isLoading={activityLoading}
                    username={user.username}
                />
            )}

            <GenreGrid genres={genres ?? []} />

            <Rail
                title="New releases"
                note="out in the last 90 days"
                games={fresh?.data ?? []}
                platforms={platforms ?? []}
                isLoading={freshLoading}
                actionsFor={actionsFor}
                statusFor={statusFor}
                footValueFor={(game) => formatReleaseShort(game.releaseDate)}
            />

            {viewing !== null && user && (
                <LogViewer
                    gameId={viewing}
                    username={user.username}
                    onClose={() => setViewing(null)}
                    onEdit={() => {
                        setViewing(null);
                        setLogging(viewing);
                    }}
                />
            )}

            {logging !== null && (
                <CreateOrEditGameLogPopup
                    closePopup={() => setLogging(null)}
                    viewUpdatedLog={() => setLogging(null)}
                    gamelog={
                        current && current.gameId === logging ? current : null
                    }
                    gameID={logging}
                />
            )}
        </div>
    );
};

export default HomePage;
