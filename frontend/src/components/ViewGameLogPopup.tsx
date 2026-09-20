import { getPlatformIcon } from "../lib/icons";
import { Star, Trophy } from "lucide-react";
import { buttonClass } from "./ui/Button";
import type { GameLogWithGame } from "../api";
import { displayStatusFor } from "../constants/gameStatus";
import StatusBadge from "./ui/StatusBadge";
import { useGame, usePlatforms } from "../hooks/queries/useGames";
import Modal from "./ui/Modal";

export interface LogPopupAction {
    label: string;
    onSelect: () => void;
}

interface ViewGameLogPopupProps {
    /** Non-null: the parent does not render this until it has a log. */
    gamelog: GameLogWithGame;
    closePopup: () => void;
    /**
     * What the viewer can do about this log — edit their own, jump to their
     * own log of the same game, or start one. Omitted when signed out, which
     * leaves Close as the only control.
     *
     * The caller decides: it used to be six props reconstructing the same
     * three-way branch here, twice over, and two of them were always no-ops.
     */
    primaryAction?: LogPopupAction;
}

const ViewGameLogPopup: React.FC<ViewGameLogPopupProps> = ({
    gamelog,
    closePopup,
    primaryAction,
}) => {
    const { data: game } = useGame(gamelog.gameId);

    // a played log displays its playedStatus (finished, mastered, ...)
    const displayedStatus = displayStatusFor(
        gamelog.status,
        gamelog.playedStatus
    );

    const { data: platforms } = usePlatforms();
    const platform = (platforms ?? []).find((p) => p.slug === gamelog.platform);
    const PlatformIcon = getPlatformIcon(gamelog.platform ?? "");

    return (
        <Modal
            onClose={closePopup}
            className="flex w-full max-w-[600px] flex-col gap-5"
        >
            <div className="contents">
                <h2 className="border-b border-subtle pb-3 text-label text-content-muted">
                    Your log
                </h2>

                <div className="relative flex w-full flex-col gap-4">
                    <h3 className="max-w-[calc(100%-72px)] text-left font-display text-2xl text-content sm:max-w-full">
                        {game?.title}
                        <span className="ml-2.5 text-xl font-light text-content-secondary">
                            {game?.releaseDate?.slice(0, 4)}
                        </span>
                    </h3>

                    <div className="flex w-full">
                        <div className="absolute top-0 right-0 flex min-h-40 w-16 max-w-[30%] flex-col gap-2 sm:relative sm:w-max">
                            <img
                                className="w-full rounded-md object-cover shadow-e2"
                                src={game?.coverUrl ?? ""}
                                alt={game?.title ?? ""}
                            />
                        </div>
                        <div className="flex min-h-32 flex-grow justify-between">
                            <div className="flex flex-col gap-1 text-left sm:pl-4">
                                <p className="flex items-center gap-2 text-content">
                                    Status:{" "}
                                    <StatusBadge status={displayedStatus} />
                                </p>
                                {gamelog.platform ? (
                                    <p className="text-content">
                                        Platform:{" "}
                                        <span className="font-extralight">
                                            {platform?.displayName}
                                        </span>
                                        <PlatformIcon
                                            size={14}
                                            className="ml-1.5 inline"
                                            aria-hidden
                                        />
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
                                    <Trophy
                                        size={16}
                                        className="text-gold"
                                        aria-hidden
                                    />
                                    <p className="font-extralight text-content">
                                        {gamelog.achievementsCompleted || 0}/
                                        {gamelog.achievementsTotal || "?"}
                                    </p>
                                </span>
                                <span className="flex items-center justify-start gap-2 text-lg">
                                    <Star
                                        size={16}
                                        className="text-brand-hover"
                                        aria-hidden
                                    />
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
                    {primaryAction && (
                        <button
                            className={buttonClass("secondary", "w-full sm:flex-1")}
                            onClick={() => {
                                closePopup();
                                primaryAction.onSelect();
                            }}
                        >
                            {primaryAction.label}
                        </button>
                    )}
                    <button
                        className={buttonClass(
                            "ghost",
                            primaryAction ? "w-full sm:flex-1" : "w-full"
                        )}
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
