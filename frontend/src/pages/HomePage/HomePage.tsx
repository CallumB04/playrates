import { useMemo } from "react";
import { Link } from "react-router-dom";
import GameSection from "./components/GameSection";
import { useAuth } from "../../contexts/AuthContext";
import { useAccountForm } from "../../contexts/AccountFormContext";
import { useGames, useSiteStats } from "../../hooks/queries/useGames";

// common styles for all game section titles in home page
const gameSectionTitleStyles = `text-content font-lexend font-normal tracking-wide
                                text-3xl md:text-4xl 2xl:text-[42px] uppercase mt-16 text-center
                                [&:not(:first-of-type)]:mt-24 [&:not(:first-of-type)]:2xl:mt-28`;

const HomePage = () => {
    const { user } = useAuth();
    const { openLogin, openSignup } = useAccountForm();

    // one counts endpoint, replacing three whole-table fetches
    const { data: stats } = useSiteStats();

    const {
        data: gamesPage,
        error: gamesError,
        isLoading: gamesLoading,
    } = useGames({ limit: 100 });

    const games = useMemo(() => gamesPage?.data ?? [], [gamesPage]);

    const trending = useMemo(
        () => games.filter((game) => game.isTrending),
        [games]
    );

    const mostPopular = useMemo(() => games.slice(0, 6), [games]);

    /**
     * Copy before sorting. The old code called games.sort() directly on the
     * React Query cache array, which mutates it in place — so after the first
     * render "Most Popular" above was silently showing the newest six too.
     */
    const newReleases = useMemo(
        () =>
            [...games]
                .sort(
                    (a, b) =>
                        Date.parse(b.releaseDate ?? "") -
                        Date.parse(a.releaseDate ?? "")
                )
                .slice(0, 6),
        [games]
    );

    return (
        <>
            <div className="my-12 flex flex-wrap gap-y-10 sm:px-2 md:min-h-[50vh] md:px-8 xl:px-20 2xl:mt-20">
                <div className="w-full lg:w-1/2">
                    <h1 className="text-center font-lexend text-[64px] font-bold text-content md:text-7xl lg:text-left lg:text-8xl 2xl:text-9xl">
                        PlayRates
                    </h1>
                    <h2 className="ml-1 mt-1 text-center font-lexend text-xl font-semibold text-content-secondary md:mt-5 lg:text-left lg:text-2xl 2xl:mt-7 2xl:text-3xl">
                        All of your games in one place...
                    </h2>

                    {!user ? (
                        <div className="mx-auto mt-12 flex w-full flex-col items-center justify-center gap-5 overflow-x-visible font-lexend md:mt-16 md:gap-3 lg:w-full lg:flex-row lg:justify-start 2xl:mt-20">
                            <button
                                type="button"
                                onClick={openSignup}
                                className="button-primary w-11/12 max-w-[500px] text-lg lg:w-max xl:text-2xl"
                            >
                                Get Started
                            </button>
                            <button
                                type="button"
                                onClick={openLogin}
                                className="button-secondary w-11/12 max-w-[500px] text-lg lg:hidden"
                            >
                                Log in
                            </button>
                            <p className="hidden text-xl font-light text-content lg:block 2xl:text-2xl">
                                or{" "}
                                <button
                                    type="button"
                                    onClick={openLogin}
                                    className="hover-text-white underline"
                                >
                                    log in
                                </button>{" "}
                                if you have an account
                            </p>
                        </div>
                    ) : (
                        <p className="mt-12 text-center font-lexend text-[22px] font-extralight italic text-content md:text-2xl lg:text-left 2xl:mt-20 2xl:text-3xl">
                            Welcome back{" "}
                            <Link
                                to={`/user/${user.username}`}
                                className="hover-text-white font-normal"
                            >
                                {user.username}
                            </Link>
                            !
                        </p>
                    )}
                </div>

                <div className="flex w-full items-center justify-evenly font-lexend text-xl text-content lg:w-1/2 lg:justify-evenly lg:pl-10 lg:text-[22px] 2xl:text-3xl">
                    <div className="flex flex-col gap-y-1 text-center">
                        <i
                            className="fa-solid fa-user-group text-3xl md:text-[32px] 2xl:text-4xl"
                            aria-hidden="true"
                        ></i>
                        <p>{stats?.userCount ?? 0} Users</p>
                    </div>
                    <div className="flex flex-col gap-y-1 text-center">
                        <i
                            className="fa-solid fa-gamepad text-3xl md:text-[32px] 2xl:text-4xl"
                            aria-hidden="true"
                        ></i>
                        <p>{stats?.gameCount ?? 0} Games</p>
                    </div>
                    <div className="flex flex-col gap-y-1 text-center">
                        <i
                            className="fa-solid fa-chart-bar text-3xl md:text-[32px] 2xl:text-4xl"
                            aria-hidden="true"
                        ></i>
                        <p>{stats?.logCount ?? 0} Logs</p>
                    </div>
                </div>
            </div>

            <h2 className={gameSectionTitleStyles}>Trending Games</h2>
            <GameSection
                games={trending}
                loading={gamesLoading}
                error={gamesError}
            />

            {/* Most Popular games (by amount of user listings) */}
            <h2 className={gameSectionTitleStyles}>Most Popular</h2>
            <GameSection
                games={mostPopular}
                loading={gamesLoading}
                error={gamesError}
            />

            <h2 className={gameSectionTitleStyles}>New Releases</h2>
            <GameSection
                games={newReleases}
                loading={gamesLoading}
                error={gamesError}
            />
        </>
    );
};

export default HomePage;
