import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
    fetchGameById,
    fetchGameLogs,
    fetchGameLogsByUserID,
    Game,
    GameLog,
} from "../../api";
import { getIconFromGameStatus, useUser } from "../../App";
import { useQuery } from "@tanstack/react-query";
import CreateOrEditGameLogPopup from "../../components/CreateOrEditGameLogPopup";
import ViewGameLogPopup from "../../components/ViewGameLogPopup";
import { fetchReviewsByGameID, Review } from "../../api/reviews";
import ProfilePicture from "../../components/ProfilePicture";
import GamePlatform from "../../components/GamePlatform";

interface GamePageProps {
    openLoginForm: () => void;
    runNotification: (
        text: string,
        type: "success" | "error" | "pending"
    ) => void;
}

const GamePage: React.FC<GamePageProps> = ({
    openLoginForm,
    runNotification,
}) => {
    const currentUser = useUser();
    const { gameID } = useParams(); // getting game id from URL
    const [game, setGame] = useState<Game | undefined>(undefined);
    const [gameLogs, setGameLogs] = useState<GameLog[] | undefined>(undefined);
    const [currentPageGameLog, setCurrentPageGameLog] =
        useState<GameLog | null>(null);

    const [hoveringLogCount, setHoveringLogCount] = useState<boolean>(false);

    // game log popup visiblilities
    const [viewGameLogPopupVisible, setViewGameLogPopupVisible] =
        useState<boolean>(false);
    const [editGameLogPopupVisible, setEditGameLogPopupVisible] =
        useState<boolean>(false);
    const [createGameLogPopupVisible, setCreateGameLogPopupVisible] =
        useState<boolean>(false);

    // fetching gamelogs from API
    const {
        data: overallGameLogs,
        refetch: refetchOverallGameLogs,
    } = useQuery<{ [userID: string]: GameLog[] }>({
        queryKey: ["gamelogs"],
        queryFn: fetchGameLogs,
    });

    // fetching current users game logs from API, if logged in
    const {
        data: currentUserGameLogs,
        refetch: refetchCurrentUserGameLogs,
    } = useQuery<GameLog[] | undefined>({
        queryKey: ["currentUserGameLogs", currentUser?.id],
        queryFn: () => fetchGameLogsByUserID(currentUser!.id),
        enabled: !!currentUser,
    });

    // fetching reviews off this game
    const { data: gameReviews } = useQuery<Review[]>({
        queryKey: ["gameReviews", game?.id],
        queryFn: () => fetchReviewsByGameID(game!.id),
        enabled: !!game,
    });

    useEffect(() => {
        if (currentUserGameLogs) {
            setCurrentPageGameLog(
                currentUserGameLogs.find((log) => log.id === game?.id) ?? null
            );
        }
    }, [currentUserGameLogs, game]);

    useEffect(() => {
        const loadGameByID = async () => {
            // fetching game with given ID
            const fetchedGame = await fetchGameById(Number(gameID));

            // sets game in state when fetched
            if (fetchedGame) {
                setGame(fetchedGame);
            }
        };

        loadGameByID();
    }, []);

    useEffect(() => {
        if (overallGameLogs && game) {
            // flattens all nested logs into a singular array of game logs
            // then filters game based on which matches the current game
            const matchingGameLogs = Object.values(overallGameLogs)
                .flatMap((logs) => logs)
                .filter((log) => log.id === game?.id);
            setGameLogs(matchingGameLogs);
        }
    }, [overallGameLogs, game]);

    // function ran after successful edit or creation of a log
    const viewUpdatedLog = async () => {
        refetchCurrentUserGameLogs();
        refetchOverallGameLogs();
        setViewGameLogPopupVisible(true);
    };

    return (
        <section className="mx-auto mt-8 max-w-[1200px] font-lexend lg:mt-20">
            <span className="flex flex-col gap-8 md:flex-row">
                {/* Left column */}
                <div className="flex gap-4">
                    <div className="flex w-max flex-col gap-3">
                        <img
                            src={`/PlayRates/assets/game-covers/${game?.id}.png`}
                            className="max-h-64 max-w-52 rounded-md md:max-h-80 md:min-w-52 md:max-w-max"
                        />
                        <div className="flex w-full flex-col gap-2">
                            <span
                                className="relative flex w-full items-center justify-center gap-2 rounded border-2 border-text-secondary px-2.5 py-1.5 text-text-primary"
                                onMouseOver={() => setHoveringLogCount(true)}
                                onMouseOut={() => setHoveringLogCount(false)}
                            >
                                <p>
                                    {gameLogs?.length}{" "}
                                    {gameLogs?.length === 1 ? "Log" : "Logs"}
                                </p>
                                <i className="fa-solid fa-chart-bar"></i>

                                {/* Log count hover menu */}
                                {hoveringLogCount ? (
                                    <div className="hover-menu fade-in-right absolute -right-36 top-0 flex w-max flex-col gap-1 px-3 py-2 shadow-md">
                                        {[
                                            "played",
                                            "playing",
                                            "backlog",
                                            "wishlist",
                                        ].map((status) => (
                                            <span
                                                className="flex items-center gap-2 font-light"
                                                key={status}
                                            >
                                                <i
                                                    className={getIconFromGameStatus(
                                                        status
                                                    )}
                                                ></i>
                                                <p>
                                                    {status
                                                        .slice(0, 1)
                                                        .toUpperCase() +
                                                        status.slice(1)}
                                                    :
                                                </p>
                                                <p>
                                                    {
                                                        gameLogs?.filter(
                                                            (log) =>
                                                                log.status ===
                                                                status
                                                        ).length
                                                    }
                                                </p>
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <></>
                                )}
                            </span>
                            <span className="flex w-full items-center justify-center gap-2 rounded border-2 border-text-secondary px-2.5 py-1.5 text-text-primary">
                                {gameLogs &&
                                gameLogs.filter((log) => log.rating).length >=
                                    1 ? (
                                    <p>
                                        {gameLogs?.reduce(
                                            (acc, log) =>
                                                log.rating
                                                    ? acc + log.rating
                                                    : acc + 0,
                                            0
                                        ) /
                                            gameLogs.filter((log) => log.rating)
                                                .length}{" "}
                                        Avg. Rating
                                    </p>
                                ) : (
                                    <p>No Rating</p>
                                )}
                                <i className="fa-solid fa-star"></i>
                            </span>
                            <button
                                className={`${
                                    currentUserGameLogs?.some(
                                        (log) => log.id === game?.id
                                    )
                                        ? "button-secondary"
                                        : "button-primary"
                                } flex items-center justify-center gap-3`}
                                onClick={
                                    currentUser
                                        ? currentUserGameLogs?.some(
                                              (log) => log.id === game?.id
                                          )
                                            ? () =>
                                                  setViewGameLogPopupVisible(
                                                      true
                                                  )
                                            : () =>
                                                  setCreateGameLogPopupVisible(
                                                      true
                                                  )
                                        : openLoginForm
                                }
                            >
                                <p>
                                    {currentUser
                                        ? currentUserGameLogs?.some(
                                              (log) => log.id === game?.id
                                          )
                                            ? "View my Log"
                                            : "Log this Game"
                                        : "Log in to Add"}
                                </p>
                                <i
                                    className={`fa-solid ${
                                        currentUser
                                            ? currentUserGameLogs?.some(
                                                  (log) => log.id === game?.id
                                              )
                                                ? "fa-eye"
                                                : "fa-plus"
                                            : "fa-arrow-right-to-bracket"
                                    }`}
                                ></i>
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-col gap-1 md:hidden">
                        <h2 className="text-2xl tracking-wide text-text-primary sm:text-3xl">
                            {game?.title}
                        </h2>
                        <p className="font-light text-text-secondary sm:text-lg">
                            Released on{" "}
                            <span className="font-normal">
                                {game?.releaseDate &&
                                game?.releaseDate !== "TBA"
                                    ? new Date(game?.releaseDate)
                                          .toUTCString()
                                          .slice(5, 16)
                                    : "TBA"}
                            </span>
                        </p>
                    </div>
                </div>
                {/* Right column */}
                <div className="flex w-full flex-col gap-2">
                    <h2 className="hidden text-4xl tracking-wide text-text-primary md:block">
                        {game?.title}
                    </h2>
                    <p className="hidden text-xl font-light text-text-secondary md:block">
                        Released on{" "}
                        <span className="font-normal">
                            {game?.releaseDate && game?.releaseDate !== "TBA"
                                ? new Date(game?.releaseDate)
                                      .toUTCString()
                                      .slice(5, 16)
                                : "TBA"}
                        </span>
                    </p>
                    <p className="line-clamp-[8] text-center text-text-secondary md:mt-5 md:text-left">
                        {game?.description
                            ? game.description
                            : "This game currently does not have a description..."}
                    </p>
                    <span className="mt-2 flex flex-wrap justify-center gap-3 md:justify-start">
                        {game?.platforms.map((platform) => {
                            return (
                                <GamePlatform
                                    platform={platform}
                                    textSize="base"
                                    key={platform}
                                />
                            );
                        })}
                    </span>
                    {/* Reviews Section */}
                    <div className="mt-12">
                        {/* Header and sorting */}
                        <span className="flex items-center justify-between">
                            <h2 className="text-2xl text-text-primary">
                                Reviews
                            </h2>
                            <p className="flex gap-1 font-light text-text-primary">
                                Sort By:{" "}
                                <span className="flex items-center gap-1.5 text-highlight-primary">
                                    <span className="font-normal">
                                        Most Recent
                                    </span>
                                    <i className="fas fa-chevron-down text-xs"></i>
                                </span>
                            </p>
                        </span>
                        <div className="mt-8 flex flex-col gap-5">
                            {gameReviews?.length ? (
                                gameReviews?.map((review) => (
                                    <div
                                        key={review.text}
                                        className="flex gap-3"
                                    >
                                        <ProfilePicture
                                            sizes={[
                                                { value: 16, borderSize: 2 },
                                            ]}
                                            username={review.reviewerName!}
                                            file={
                                                review.reviewerProfilePicture!
                                            }
                                            link={true}
                                        />
                                        <div className="flex flex-col gap-0.5 pt-1">
                                            <span className="flex items-center gap-2">
                                                <Link
                                                    className="hover-text-white text-xl font-semibold"
                                                    to={`/user/${review.reviewerName}`}
                                                >
                                                    {review.reviewerName}
                                                </Link>
                                                {review.reviewerGameLogPlatform && (
                                                    <GamePlatform
                                                        platform={
                                                            review.reviewerGameLogPlatform
                                                        }
                                                        textSize="xs"
                                                    />
                                                )}
                                            </span>
                                            <span className="flex items-center gap-1 text-sm">
                                                <p className="font-light text-text-primary">
                                                    {review.reviewerGameLogRating
                                                        ? review.reviewerGameLogRating
                                                        : "?"}
                                                    /10
                                                </p>
                                                <i className="fas fa-star text-highlight-primary"></i>
                                            </span>
                                            <p className="mt-1.5 text-text-secondary">
                                                {review.text}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <h2 className="text-center text-xl text-text-secondary">
                                    No Reviews found for this game...
                                </h2>
                            )}
                        </div>
                    </div>
                </div>
            </span>

            {viewGameLogPopupVisible ? (
                <ViewGameLogPopup
                    closePopup={() => setViewGameLogPopupVisible(false)}
                    isMyAccount={true}
                    userLoggedIn={currentUser ? true : false}
                    gamelog={currentPageGameLog}
                    openEdit={() => setEditGameLogPopupVisible(true)}
                    openCreate={() => setCreateGameLogPopupVisible(true)}
                    currentUserSharesLog={true}
                    redirectAndOpenView={() => {}}
                />
            ) : (
                <></>
            )}
            {createGameLogPopupVisible ? (
                <CreateOrEditGameLogPopup
                    closePopup={() => setCreateGameLogPopupVisible(false)}
                    editing={false}
                    gameID={game?.id}
                    userID={currentUser!.id}
                    runNotification={runNotification}
                    viewUpdatedLog={() => {
                        refetchCurrentUserGameLogs();
                        refetchOverallGameLogs();
                    }}
                />
            ) : (
                <></>
            )}
            {editGameLogPopupVisible ? (
                <CreateOrEditGameLogPopup
                    closePopup={() => setEditGameLogPopupVisible(false)}
                    gamelog={currentPageGameLog}
                    editing={true}
                    userID={currentUser!.id}
                    runNotification={runNotification}
                    viewUpdatedLog={viewUpdatedLog}
                />
            ) : (
                <></>
            )}
        </section>
    );
};

export default GamePage;
