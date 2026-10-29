import { useMemo } from "react";
import {
    formatLogCount,
    formatReleaseShort,
    releaseYear,
} from "../../lib/format";
import { useAuth } from "../../contexts/AuthContext";
import { useAccountForm } from "../../contexts/AccountFormContext";
import {
    useGames,
    useGenres,
    usePlatforms,
    useSiteStats,
} from "../../hooks/queries/useGames";
import {
    useMyGameLogIds,
    useMyShelf,
    useUserStats,
} from "../../hooks/queries/useGameLogs";
import { latestRun, logOnShelf } from "../../api";
import { useLogFlow } from "../../components/gamelog/useLogFlow";
import { useFriendActivity } from "../../hooks/queries/useFriends";
import { useRecentReviews } from "../../hooks/queries/useReviews";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useTileActions } from "../../components/game/useTileActions";
import SignedOutHero from "./components/SignedOutHero";
import ReEntryPlate from "./components/ReEntryPlate";
import YourWeek from "./components/YourWeek";
import Rail from "../../components/game/GameRail";
import GenreGrid from "./components/GenreGrid";
import FriendFeed from "./components/FriendFeed";
import ReviewFeed from "./components/ReviewFeed";
import CommunityTrending from "./components/CommunityTrending";
import { useTrendingThreads } from "../../hooks/queries/useCommunity";

const RAIL_SIZE = 24;

/** The last 90 days, so "new releases" excludes unreleased TBA titles. */
const releaseWindow = () => {
    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - 90);
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    return { releasedAfter: iso(from), releasedBefore: iso(now) };
};

const HomePage = () => {
    /* No name of its own: the homepage keeps the site title. */
    usePageTitle();

    const { user } = useAuth();
    const { openSignup } = useAccountForm();
    const flow = useLogFlow();

    const { data: siteStats } = useSiteStats();
    const { data: platforms } = usePlatforms();
    const { data: genres } = useGenres();

    const window = useMemo(releaseWindow, []);

    const { data: trending, isLoading: trendingLoading } = useGames({
        trending: true,
        limit: RAIL_SIZE,
        count: false,
    });
    const { data: popular, isLoading: popularLoading } = useGames({
        sort: "logged",
        limit: RAIL_SIZE,
        count: false,
    });
    const { data: fresh, isLoading: freshLoading } = useGames({
        sort: "released",
        limit: RAIL_SIZE,
        count: false,
        ...window,
    });
    const { data: acclaimed, isLoading: acclaimedLoading } = useGames({
        sort: "rating",
        limit: RAIL_SIZE,
        count: false,
    });

    const { data: activity, isLoading: activityLoading } = useFriendActivity(6);
    const { data: reviews, isLoading: reviewsLoading } = useRecentReviews(4);
    const { data: communityTrending, isLoading: communityLoading } =
        useTrendingThreads(3);
    const communityEmpty =
        !communityLoading && (communityTrending?.length ?? 0) === 0;

    const { data: playing } = useMyShelf("playing", { limit: 1 });
    // Enough to draw a year without paging. The chart is a shape, not a ledger.
    const { data: played } = useMyShelf("played", { limit: 100 });
    const { data: yearStats } = useUserStats(
        user?.username ?? "",
        new Date().getFullYear()
    );
    const { data: allTime } = useUserStats(user?.username ?? "");

    const current = playing?.data[0] && logOnShelf(playing.data[0], "playing");
    // A game counts once in the year however many consoles it was played on.
    const yearLogs = useMemo(
        () => (played?.data ?? []).map(latestRun),
        [played]
    );

    const { data: myLogIds } = useMyGameLogIds();

    // Every cover on the page can be logged from where it sits.
    const { actionsFor, statusFor } = useTileActions();

    return (
        <div className="flex flex-col gap-11">
            {user ? (
                <div className="flex flex-col gap-4 lg:gap-6">
                    <ReEntryPlate
                        username={user.username}
                        displayName={user.firstName || user.username}
                        isNew={myLogIds?.length === 0}
                        current={current}
                        shelves={allTime?.byStatus}
                        yearLogs={yearLogs}
                        yearStats={yearStats}
                        onUpdateLog={() =>
                            current && flow.edit(current.gameId, current.id)
                        }
                    />
                    <YourWeek />
                </div>
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

            {/* Second place is the most-seen spot after the top, so an empty
                community doesn't take it; its invitation moves down the page. */}
            {!communityEmpty && (
                <CommunityTrending
                    threads={communityTrending ?? []}
                    isLoading={communityLoading}
                />
            )}

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
                        ? formatLogCount(game.logCount)
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

            {communityEmpty && (
                <CommunityTrending threads={[]} isLoading={false} />
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
        </div>
    );
};

export default HomePage;
