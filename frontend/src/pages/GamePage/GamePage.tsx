import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { GameLogWithGame } from "../../api";
import { getIconFromGameStatus } from "../../constants/gameStatus";
import { useAuth } from "../../contexts/AuthContext";
import { useAccountForm } from "../../contexts/AccountFormContext";
import { useGame, useGameStats } from "../../hooks/queries/useGames";
import { useMyGameLogs } from "../../hooks/queries/useGameLogs";
import { useGameReviews } from "../../hooks/queries/useReviews";
import CreateOrEditGameLogPopup from "../../components/CreateOrEditGameLogPopup";
import ViewGameLogPopup from "../../components/ViewGameLogPopup";
import ProfilePicture from "../../components/ProfilePicture";
import GamePlatform from "../../components/GamePlatform";

type OpenModal = "view" | "edit" | "create" | null;

const GamePage = () => {
    const { user: currentUser } = useAuth();
    const { openLogin } = useAccountForm();
    const { gameID } = useParams();

    const gameId = Number(gameID);
    // a real query keyed on the id, so navigating between two games refetches.
    // The old effect had an empty dependency array and kept the stale game.
    const { data: game } = useGame(
        Number.isFinite(gameId) ? gameId : undefined
    );
    const { data: stats } = useGameStats(game?.id);
    const { data: reviewsPage } = useGameReviews(game?.id);
    const { data: myLogsPage } = useMyGameLogs();

    const [modal, setModal] = useState<OpenModal>(null);
    const [hoveringLogCount, setHoveringLogCount] = useState(false);

    const gameReviews = useMemo(() => reviewsPage?.data ?? [], [reviewsPage]);

    const currentPageGameLog: GameLogWithGame | null = useMemo(
        () =>
            (myLogsPage?.data ?? []).find((log) => log.gameId === game?.id) ??
            null,
        [myLogsPage, game]
    );

    const hasLog = currentPageGameLog !== null;

    /**
     * The same three-way condition was previously written out four times, for
     * the class, the handler, the label and the icon.
     */
    const logButtonState = !currentUser
        ? "anonymous"
        : hasLog
          ? "logged"
          : "unlogged";

    const LOG_BUTTON = {
        anonymous: {
            className: "button-primary",
            label: "Log in to Add",
            icon: "fa-arrow-right-to-bracket",
            onClick: openLogin,
        },
        logged: {
            className: "button-secondary",
            label: "View my Log",
            icon: "fa-eye",
            onClick: () => setModal("view"),
        },
        unlogged: {
            className: "button-primary",
            label: "Log this Game",
            icon: "fa-plus",
            onClick: () => setModal("create"),
        },
    } as const;

    const logButton = LOG_BUTTON[logButtonState];

    return (
        <section className="mx-auto mt-8 max-w-[1200px] font-lexend lg:mt-20">
            <span className="flex flex-col gap-8 md:flex-row">
                {/* Left column */}
                <div className="flex gap-4">
                    <div className="flex w-max flex-col gap-3">
                        <img
                            src={game?.coverUrl ?? ""}
                            alt={game?.title ?? ""}
                            className="max-h-64 max-w-52 rounded-md md:max-h-80 md:min-w-52 md:max-w-max"
                        />
                        <div className="flex w-full flex-col gap-2">
                            <span
                                className="relative flex w-full items-center justify-center gap-2 rounded border-2 border-content-secondary px-2.5 py-1.5 text-content"
                                onMouseOver={() => setHoveringLogCount(true)}
                                onMouseOut={() => setHoveringLogCount(false)}
                            >
                                <p>
                                    {stats?.logCount ?? 0}{" "}
                                    {stats?.logCount === 1 ? "Log" : "Logs"}
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
                                                    {stats?.byStatus[status] ??
                                                        0}
                                                </p>
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <></>
                                )}
                            </span>
                            <span className="flex w-full items-center justify-center gap-2 rounded border-2 border-content-secondary px-2.5 py-1.5 text-content">
                                {stats?.averageRating !== null &&
                                stats?.averageRating !== undefined ? (
                                    <p>{stats.averageRating} Avg. Rating</p>
                                ) : (
                                    <p>No Rating</p>
                                )}
                                <i className="fa-solid fa-star"></i>
                            </span>
                            <button
                                className={`${logButton.className} flex items-center justify-center gap-3`}
                                onClick={logButton.onClick}
                            >
                                <p>{logButton.label}</p>
                                <i className={`fa-solid ${logButton.icon}`}></i>
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-col gap-1 md:hidden">
                        <h2 className="text-2xl tracking-wide text-content sm:text-3xl">
                            {game?.title}
                        </h2>
                        <p className="font-light text-content-secondary sm:text-lg">
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
                    <h2 className="hidden text-4xl tracking-wide text-content md:block">
                        {game?.title}
                    </h2>
                    <p className="hidden text-xl font-light text-content-secondary md:block">
                        Released on{" "}
                        <span className="font-normal">
                            {game?.releaseDate && game?.releaseDate !== "TBA"
                                ? new Date(game?.releaseDate)
                                      .toUTCString()
                                      .slice(5, 16)
                                : "TBA"}
                        </span>
                    </p>
                    <p className="line-clamp-[8] text-center text-content-secondary md:mt-5 md:text-left">
                        {game?.description
                            ? game.description
                            : "This game currently does not have a description..."}
                    </p>
                    <span className="mt-2 flex flex-wrap justify-center gap-3 md:justify-start">
                        {game?.platforms.map((platform) => {
                            return (
                                <GamePlatform
                                    platform={platform}
                                    size="base"
                                    key={platform}
                                />
                            );
                        })}
                    </span>
                    {/* Reviews Section */}
                    <div className="mt-12">
                        {/* Header and sorting */}
                        <span className="flex items-center justify-between">
                            <h2 className="text-2xl text-content">Reviews</h2>
                            <p className="flex gap-1 font-light text-content">
                                Sort By:{" "}
                                <span className="flex items-center gap-1.5 text-brand">
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
                                    <div key={review.id} className="flex gap-3">
                                        <ProfilePicture
                                            variant="review"
                                            username={review.author.username}
                                            file={
                                                review.author.pictureUrl ?? ""
                                            }
                                            link={true}
                                        />
                                        <div className="flex flex-col gap-0.5 pt-1">
                                            <span className="flex items-center gap-2">
                                                <Link
                                                    className="hover-text-white text-xl font-semibold"
                                                    to={`/user/${review.author.username}`}
                                                >
                                                    {review.author.username}
                                                </Link>
                                                {review.platform && (
                                                    <GamePlatform
                                                        platform={
                                                            review.platform
                                                        }
                                                        size="xs"
                                                    />
                                                )}
                                            </span>
                                            <span className="flex items-center gap-1 text-sm">
                                                <p className="font-light text-content">
                                                    {review.rating ?? "?"}
                                                    /10
                                                </p>
                                                <i className="fas fa-star text-brand"></i>
                                            </span>
                                            <p className="mt-1.5 text-content-secondary">
                                                {review.body}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <h2 className="text-center text-xl text-content-secondary">
                                    No Reviews found for this game...
                                </h2>
                            )}
                        </div>
                    </div>
                </div>
            </span>

            {modal === "view" && currentPageGameLog && (
                <ViewGameLogPopup
                    closePopup={() => setModal(null)}
                    isMyAccount={true}
                    userLoggedIn={!!currentUser}
                    gamelog={currentPageGameLog}
                    openEdit={() => setModal("edit")}
                    openCreate={() => setModal("create")}
                    currentUserSharesLog={true}
                    redirectAndOpenView={() => {}}
                    profilePage={false}
                />
            )}

            {modal === "create" && game && (
                <CreateOrEditGameLogPopup
                    closePopup={() => setModal(null)}
                    editing={false}
                    gameID={game.id}
                    // the mutation invalidates the caches; no manual refetches
                    viewUpdatedLog={() => setModal("view")}
                />
            )}

            {modal === "edit" && currentPageGameLog && (
                <CreateOrEditGameLogPopup
                    closePopup={() => setModal(null)}
                    gamelog={currentPageGameLog}
                    editing={true}
                    viewUpdatedLog={() => setModal("view")}
                />
            )}
        </section>
    );
};

export default GamePage;
