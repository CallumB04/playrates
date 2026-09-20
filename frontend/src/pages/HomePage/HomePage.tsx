import { useMemo, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useAccountForm } from "../../contexts/AccountFormContext";
import {
    useGames,
    useGameStats,
    usePlatforms,
    useSiteStats,
} from "../../hooks/queries/useGames";
import {
    useMyGameLogs,
    useUserStats,
} from "../../hooks/queries/useGameLogs";
import CreateOrEditGameLogPopup from "../../components/CreateOrEditGameLogPopup";
import SignedOutHero from "./components/SignedOutHero";
import ReEntryPlate from "./components/ReEntryPlate";
import Rail from "./components/Rail";

const RAIL_SIZE = 28;

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
    const { openSignup } = useAccountForm();
    const [editingLog, setEditingLog] = useState(false);

    const { data: siteStats } = useSiteStats();
    const { data: platforms } = usePlatforms();

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

    /* The signed-out card features the most-tracked title, with its real
       community figures rather than an invented personal log. */
    const feature = popular?.data[0];
    const { data: featureStats } = useGameStats(user ? undefined : feature?.id);

    /* meta.total, not the length of a page — counting a page would be wrong
       for anyone with more than a page of logs. */
    const { data: playing } = useMyGameLogs("playing", { limit: 1 });
    const { data: backlog } = useMyGameLogs("backlog", { limit: 1 });
    const { data: currentPage } = useMyGameLogs("playing", { limit: 1 });
    const { data: yearStats } = useUserStats(
        user?.username ?? "",
        new Date().getFullYear()
    );

    const current = currentPage?.data[0];

    return (
        <div className="flex flex-col gap-10">
            {user ? (
                <ReEntryPlate
                    username={user.username}
                    current={current}
                    playingCount={playing?.meta.total ?? 0}
                    backlogCount={backlog?.meta.total ?? 0}
                    yearStats={yearStats}
                    onUpdateLog={() => setEditingLog(true)}
                />
            ) : (
                <SignedOutHero
                    siteStats={siteStats}
                    feature={feature}
                    featureStats={featureStats}
                    onStart={openSignup}
                />
            )}

            <Rail
                title="Trending"
                note="what people are opening this week"
                games={trending?.data ?? []}
                platforms={platforms ?? []}
                isLoading={trendingLoading}
            />
            <Rail
                title="Most logged"
                note="all time, by PlayRates logs"
                games={popular?.data ?? []}
                platforms={platforms ?? []}
                isLoading={popularLoading}
            />
            <Rail
                title="New releases"
                note="out in the last 90 days"
                games={fresh?.data ?? []}
                platforms={platforms ?? []}
                isLoading={freshLoading}
            />

            {editingLog && current && (
                <CreateOrEditGameLogPopup
                    closePopup={() => setEditingLog(false)}
                    viewUpdatedLog={() => setEditingLog(false)}
                    gamelog={current}
                    gameID={current.gameId}
                    editing
                />
            )}
        </div>
    );
};

export default HomePage;
