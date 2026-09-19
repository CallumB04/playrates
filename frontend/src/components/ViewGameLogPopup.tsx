import type { GameLogWithGame } from "../api";
import { getColorFromGameStatus } from "../constants/gameStatus";
import { useGame, usePlatforms } from "../hooks/queries/useGames";
import Modal from "./ui/Modal";
import { capitalise } from "../lib/format";

interface ViewGameLogPopupProps {
    /** Non-null: the parent does not render this until it has a log. */
    gamelog: GameLogWithGame;
    closePopup: () => void;
    openEdit: () => void;
    openCreate: () => void;
    redirectAndOpenView: () => void;
    userLoggedIn: boolean;
    isMyAccount: boolean;
    currentUserSharesLog: boolean;
    profilePage: boolean;
}

const ViewGameLogPopup: React.FC<ViewGameLogPopupProps> = ({
    gamelog,
    closePopup,
    openEdit,
    openCreate,
    redirectAndOpenView,
    userLoggedIn,
    isMyAccount,
    currentUserSharesLog,
    profilePage,
}) => {
    const { data: game } = useGame(gamelog.gameId);

    // a played log displays its playedStatus (finished, mastered, ...)
    const displayedStatus =
        gamelog.status === "played" && gamelog.playedStatus
            ? gamelog.playedStatus
            : gamelog.status;
    const statusColors = getColorFromGameStatus(displayedStatus);

    const { data: platforms } = usePlatforms();
    const platform = (platforms ?? []).find((p) => p.slug === gamelog.platform);

    return (
        <Modal
            onClose={closePopup}
            className="flex w-[600px] flex-col gap-6 text-center"
        >
            <div className="contents">
                <h2 className="border-b border-b-subtle pb-3 text-xl text-content">
                    View Log
                </h2>

                <div className="relative flex w-full flex-col gap-4">
                    <h3 className="max-w-[calc(100%-72px)] text-left text-2xl text-content sm:max-w-full">
                        {game?.title}
                        <span className="ml-2.5 text-xl font-light text-content-secondary">
                            {game?.releaseDate?.slice(0, 4)}
                        </span>
                    </h3>

                    <div className="flex w-full">
                        <div className="absolute right-0 top-0 flex min-h-40 w-16 max-w-[30%] flex-col gap-2 sm:relative sm:w-max">
                            <img
                                className="w-full rounded-md object-cover"
                                src={game?.coverUrl ?? ""}
                                alt={game?.title ?? ""}
                            />
                        </div>
                        <div className="flex min-h-32 flex-grow justify-between">
                            <div className="flex flex-col gap-1 text-left sm:pl-4">
                                <p className="text-content">
                                    Status:{" "}
                                    <span
                                        className={`font-light ${statusColors?.bg} ${statusColors?.text} rounded-full px-1.5 py-0.5`}
                                    >
                                        {gamelog.status === "played"
                                            ? capitalise(gamelog.playedStatus!)
                                            : capitalise(gamelog.status)}
                                    </span>
                                </p>
                                {gamelog.platform ? (
                                    <p className="text-content">
                                        Platform:{" "}
                                        <span className="font-extralight">
                                            {platform?.displayName}
                                        </span>
                                        <i
                                            className={`${platform?.iconClass ?? ""} ml-1.5`}
                                        ></i>
                                    </p>
                                ) : (
                                    <></>
                                )}
                                {gamelog.startDate ? (
                                    <p className="text-content">
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
                                {gamelog.startDate ? (
                                    <p className="text-content">
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
                                {gamelog.hoursPlayed ? (
                                    <p className="text-content">
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
                                {gamelog.hoursToBeat ? (
                                    <p className="text-content">
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
                                    <i className="fas fa-trophy text-gold"></i>
                                    <p className="font-extralight text-content">
                                        {gamelog.achievementsCompleted || 0}/
                                        {gamelog.achievementsTotal || "?"}
                                    </p>
                                </span>
                                <span className="flex items-center justify-start gap-2 text-lg">
                                    <i className="fas fa-star text-brand-hover"></i>
                                    <p className="font-extralight text-content">
                                        {gamelog.rating && gamelog.rating !== 0
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
            </div>
        </Modal>
    );
};

export default ViewGameLogPopup;
