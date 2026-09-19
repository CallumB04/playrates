import { useEffect, useState } from "react";
import { fetchGameById, Game, GameLog } from "../api";
import ClosePopupIcon from "./ClosePopupIcon";
import { gamePlatforms, getColorFromGameStatus } from "../App";

const capitalise = (word: string) => `${word[0].toUpperCase()}${word.slice(1)}`;

interface ViewGameLogPopupProps {
    closePopup: () => void;
    isMyAccount: boolean;
    userLoggedIn: boolean;
    gamelog: GameLog | null;
    openEdit: () => void;
    openCreate: () => void;
    currentUserSharesLog: boolean;
    redirectAndOpenView: () => void;
    profilePage?: boolean;
}

const ViewGameLogPopup: React.FC<ViewGameLogPopupProps> = ({
    closePopup,
    isMyAccount,
    userLoggedIn,
    gamelog,
    openEdit,
    openCreate,
    currentUserSharesLog,
    redirectAndOpenView,
    profilePage,
}) => {
    const [game, setGame] = useState<Game | undefined>(undefined);

    // fetch game data from ID in game log, and set state when fetched
    useEffect(() => {
        const fetchGameFromLog = async () => {
            const fetchedGame = await fetchGameById(gamelog!.id);

            if (fetchedGame) {
                setGame(fetchedGame);
            }
        };

        fetchGameFromLog();
    }, []);

    // the status a "played" log displays is its playedStatus (finished, mastered, ...)
    const displayedStatus =
        gamelog?.status === "played" && gamelog.playedStatus
            ? gamelog.playedStatus
            : gamelog?.status;
    const statusColors = displayedStatus
        ? getColorFromGameStatus(displayedStatus)
        : undefined;

    return (
        <dialog className="popup-backdrop" onMouseDown={closePopup}>
            <div
                className="popup popup-default flex w-[600px] flex-col gap-6 text-center"
                onMouseDown={(event) => event.stopPropagation()}
            >
                <h2 className="border-b-[1px] border-b-[#cacaca55] pb-3 text-xl text-text-primary">
                    View Log
                </h2>

                <div className="relative flex w-full flex-col gap-4">
                    <h3 className="max-w-[calc(100%-72px)] text-left text-2xl text-text-primary sm:max-w-full">
                        {game?.title}
                        <span className="ml-2.5 text-xl font-light text-text-secondary">
                            {game?.releaseDate.slice(0, 4)}
                        </span>
                    </h3>

                    <div className="flex w-full">
                        <div className="absolute right-0 top-0 flex min-h-40 w-16 max-w-[30%] flex-col gap-2 sm:relative sm:w-max">
                            <img
                                className="w-full rounded-md object-cover"
                                src={`/PlayRates/assets/game-covers/${game?.id}.png`}
                            />
                        </div>
                        <div className="flex min-h-32 flex-grow justify-between">
                            <div className="flex flex-col gap-1 text-left sm:pl-4">
                                <p className="text-text-primary">
                                    Status:{" "}
                                    <span
                                        className={`font-light ${statusColors?.bg} ${statusColors?.text} rounded-full px-1.5 py-0.5`}
                                    >
                                        {gamelog?.status === "played"
                                            ? capitalise(gamelog.playedStatus!)
                                            : capitalise(gamelog!.status)}
                                    </span>
                                </p>
                                {gamelog?.platform ? (
                                    <p className="text-text-primary">
                                        Platform:{" "}
                                        <span className="font-extralight">
                                            {
                                                gamePlatforms.find(
                                                    (platform) =>
                                                        platform.name ===
                                                        gamelog.platform
                                                )?.display
                                            }
                                        </span>
                                        <i
                                            className={`${
                                                gamePlatforms.find(
                                                    (platform) =>
                                                        platform.name ===
                                                        gamelog.platform
                                                )?.icon
                                            } ml-1.5`}
                                        ></i>
                                    </p>
                                ) : (
                                    <></>
                                )}
                                {gamelog?.startDate ? (
                                    <p className="text-text-primary">
                                        Started:{" "}
                                        <span className="font-extralight">
                                            {new Date(gamelog.startDate)
                                                .toDateString()
                                                .slice(4)}
                                        </span>
                                    </p>
                                ) : (
                                    <></>
                                )}
                                {gamelog?.startDate ? (
                                    <p className="text-text-primary">
                                        Finished:{" "}
                                        <span className="font-extralight">
                                            {gamelog.finishDate
                                                ? new Date(gamelog.finishDate)
                                                      .toDateString()
                                                      .slice(4)
                                                : "N/A"}
                                        </span>
                                    </p>
                                ) : (
                                    <></>
                                )}
                                {gamelog?.hoursPlayed ? (
                                    <p className="text-text-primary">
                                        Time Played:{" "}
                                        <span className="font-extralight">
                                            {gamelog.hoursPlayed}
                                            <span className="text-sm">
                                                {" "}
                                                hours
                                            </span>
                                        </span>
                                    </p>
                                ) : (
                                    <></>
                                )}
                                {gamelog?.hoursToBeat ? (
                                    <p className="text-text-primary">
                                        Completed in:{" "}
                                        <span className="font-extralight">
                                            {gamelog.hoursToBeat}
                                            <span className="text-sm">
                                                {" "}
                                                hours
                                            </span>
                                        </span>
                                    </p>
                                ) : (
                                    <></>
                                )}
                            </div>

                            <div className="flex flex-col justify-end gap-1 pr-4 sm:justify-normal">
                                <span className="flex items-center justify-start gap-2 text-lg">
                                    <i className="fas fa-trophy text-yellow-300"></i>
                                    <p className="font-extralight text-text-primary">
                                        {gamelog?.achievementsCompleted || 0}/
                                        {gamelog?.achievementsTotal || "?"}
                                    </p>
                                </span>
                                <span className="flex items-center justify-start gap-2 text-lg">
                                    <i className="fas fa-star text-highlight-hover"></i>
                                    <p className="font-extralight text-text-primary">
                                        {gamelog?.rating && gamelog.rating !== 0
                                            ? gamelog.rating
                                            : "?"}
                                        /10
                                    </p>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex w-full flex-col justify-center gap-5 sm:flex-row">
                    {userLoggedIn ? (
                        <button
                            className="button-secondary w-full sm:w-1/2"
                            onClick={() => {
                                closePopup();
                                if (currentUserSharesLog && profilePage) {
                                    redirectAndOpenView();
                                } else if (isMyAccount) {
                                    openEdit();
                                } else {
                                    openCreate();
                                }
                            }}
                        >
                            {currentUserSharesLog && profilePage
                                ? "View My Log"
                                : isMyAccount
                                  ? "Edit"
                                  : "Add This Game"}
                        </button>
                    ) : (
                        <></>
                    )}
                    <button
                        className={`button-outline button-outline-default w-full ${userLoggedIn ? "sm:w-1/2" : ""}`}
                        onClick={closePopup}
                    >
                        Close
                    </button>
                </div>

                <ClosePopupIcon onClick={closePopup} />
            </div>
        </dialog>
    );
};

export default ViewGameLogPopup;
