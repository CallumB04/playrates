import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
    fetchGameLogs,
    fetchGames,
    fetchUsers,
    Game,
    GameLog,
    UserAccount,
} from "../../api";
import GameSection from "./components/GameSection";
import { useUser } from "../../App";
import { useEffect, useState } from "react";

// common styles for all game section titles in home page
const gameSectionTitleStyles = `text-content font-lexend font-normal tracking-wide
                                text-3xl md:text-4xl 2xl:text-[42px] uppercase mt-16 text-center
                                [&:not(:first-of-type)]:mt-24 [&:not(:first-of-type)]:2xl:mt-28`;

interface HomePageProps {
    openSignupForm: () => void;
    openLoginForm: () => void;
}

const HomePage: React.FC<HomePageProps> = ({
    openSignupForm,
    openLoginForm,
}) => {
    // fetching user data from react context
    const user: UserAccount | null = useUser();
    const [userCount, setUserCount] = useState<number>(0);

    // loading user count
    useEffect(() => {
        const loadUserCount = async () => {
            const users = await fetchUsers();

            if (users) {
                setUserCount(users.length);
            }
        };

        loadUserCount();
    }, []);

    /* Fetching games data using React Query for caching */

    // fetching games from API
    const {
        data: games,
        error: gamesError,
        isLoading: gamesLoading,
    } = useQuery<Game[]>({
        queryKey: ["games"],
        queryFn: fetchGames,
    });

    // fetching gamelogs from API
    const { data: gameLogs } = useQuery<{ [userID: string]: GameLog[] }>({
        queryKey: ["gamelogs"],
        queryFn: fetchGameLogs,
    });

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

                    {/* Signup / login wrapper */}

                    {!user ? (
                        <div className="mx-auto mt-12 flex w-full flex-col items-center justify-center gap-5 overflow-x-visible font-lexend md:mt-16 md:gap-3 lg:w-full lg:flex-row lg:justify-start 2xl:mt-20">
                            <p
                                onClick={openSignupForm}
                                className="button-primary w-11/12 max-w-[500px] text-lg lg:w-max xl:text-2xl"
                            >
                                Get Started
                            </p>
                            <p
                                onClick={openLoginForm}
                                className="button-secondary w-11/12 max-w-[500px] text-lg lg:hidden"
                            >
                                Log in
                            </p>
                            <p className="hidden text-xl font-light text-content lg:block 2xl:text-2xl">
                                or{" "}
                                <span
                                    onClick={openLoginForm}
                                    className="hover-text-white underline"
                                >
                                    log in
                                </span>{" "}
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
                        <i className="fa-solid fa-user-group text-3xl md:text-[32px] 2xl:text-4xl"></i>
                        <p>{userCount} Users</p>
                    </div>
                    <div className="flex flex-col gap-y-1 text-center">
                        <i className="fa-solid fa-gamepad text-3xl md:text-[32px] 2xl:text-4xl"></i>
                        <p>{games?.length || 0} Games</p>
                    </div>
                    <div className="flex flex-col gap-y-1 text-center">
                        <i className="fa-solid fa-chart-bar text-3xl md:text-[32px] 2xl:text-4xl"></i>
                        <p>
                            {gameLogs
                                ? Object.keys(gameLogs).reduce(
                                      (acc, userID) =>
                                          acc + gameLogs[userID].length,
                                      0
                                  )
                                : 0}{" "}
                            Logs
                        </p>
                    </div>
                </div>
            </div>

            {/* Trending games */}
            <h2 className={gameSectionTitleStyles}>Trending Games</h2>
            <GameSection
                games={games?.filter((game) => game.trending)}
                loading={gamesLoading}
                error={gamesError}
            />

            {/* Most Popular games (by amount of user listings) */}
            <h2 className={gameSectionTitleStyles}>Most Popular</h2>
            <GameSection
                games={games?.slice(0, 6)}
                loading={gamesLoading}
                error={gamesError}
            />

            {/* Newly released games */}
            <h2 className={gameSectionTitleStyles}>New Releases</h2>
            <GameSection
                games={games
                    ?.sort(
                        (a, b) =>
                            Date.parse(b.releaseDate) -
                            Date.parse(a.releaseDate)
                    )
                    .slice(0, 6)}
                loading={gamesLoading}
                error={gamesError}
            />
        </>
    );
};

export default HomePage;
