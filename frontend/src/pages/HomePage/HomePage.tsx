import { useMemo, useState } from "react";
import type { Game } from "@playrates/shared";
import { useAuth } from "../../contexts/AuthContext";
import { useAccountForm } from "../../contexts/AccountFormContext";
import {
    useGames,
    useGenres,
    usePlatforms,
    useSiteStats,
} from "../../hooks/queries/useGames";
import { useMyGameLogs, useUserStats } from "../../hooks/queries/useGameLogs";
import { useFriendActivity } from "../../hooks/queries/useFriends";
import { useRecentReviews } from "../../hooks/queries/useReviews";
import CreateOrEditGameLogPopup from "../../components/CreateOrEditGameLogPopup";
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

const HomePage = () => {
    const { user } = useAuth();
    const { openSignup, openLogin } = useAccountForm();
    const [logging, setLogging] = useState<number | null>(null);

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

    /* meta.total, not the length of a page — counting a page would be wrong
       for anyone with more than a page of logs. */
    const { data: playing } = useMyGameLogs("playing", { limit: 1 });
    const { data: backlog } = useMyGameLogs("backlog", { limit: 1 });
    const { data: yearStats } = useUserStats(
        user?.username ?? "",
        new Date().getFullYear()
    );

    const current = playing?.data[0];

    /* Every cover on the page can be logged from where it sits, rather than
       only from the catalogue. */
    const actionsFor = (game: Game): TileAction[] => [
        user
            ? {
                  key: "log",
                  label: "Log it",
                  tone: "primary",
                  onSelect: () => setLogging(game.id),
              }
            : {
                  key: "signin",
                  label: "Log in to add",
                  tone: "primary",
                  onSelect: openLogin,
              },
    ];

    return (
        <div className="flex flex-col gap-11">
            {user ? (
                <ReEntryPlate
                    username={user.username}
                    current={current}
                    playingCount={playing?.meta.total ?? 0}
                    backlogCount={backlog?.meta.total ?? 0}
                    yearStats={yearStats}
                    onUpdateLog={() =>
                        current && setLogging(current.gameId)
                    }
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
                note="what people are opening this week"
                games={trending?.data ?? []}
                platforms={platforms ?? []}
                isLoading={trendingLoading}
                actionsFor={actionsFor}
            />

            {/* Two feeds side by side: what people you know are doing, and
                what everyone else is saying. Both are the only parts of the
                page that change because of someone other than you. */}
            <div className="grid items-start gap-6 lg:grid-cols-2">
                {user && (
                    <FriendFeed
                        items={activity?.data ?? []}
                        isLoading={activityLoading}
                    />
                )}
                <ReviewFeed
                    reviews={reviews?.data ?? []}
                    isLoading={reviewsLoading}
                />
            </div>

            <Rail
                title="Most logged"
                note="all time, by PlayRates logs"
                games={popular?.data ?? []}
                platforms={platforms ?? []}
                isLoading={popularLoading}
                actionsFor={actionsFor}
            />

            <Rail
                title="Highest rated"
                note="by the people who logged them"
                games={acclaimed?.data ?? []}
                platforms={platforms ?? []}
                isLoading={acclaimedLoading}
                actionsFor={actionsFor}
            />

            <GenreGrid genres={genres ?? []} />

            <Rail
                title="New releases"
                note="out in the last 90 days"
                games={fresh?.data ?? []}
                platforms={platforms ?? []}
                isLoading={freshLoading}
                actionsFor={actionsFor}
            />

            {logging !== null && (
                <CreateOrEditGameLogPopup
                    closePopup={() => setLogging(null)}
                    viewUpdatedLog={() => setLogging(null)}
                    gamelog={
                        current && current.gameId === logging ? current : null
                    }
                    gameID={logging}
                    editing={!!current && current.gameId === logging}
                />
            )}
        </div>
    );
};

export default HomePage;
