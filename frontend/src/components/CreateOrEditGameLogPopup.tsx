import { useRef, useState } from "react";
import type { GameLogInput, GameStatus, PlayedStatus } from "@playrates/shared";
import type { GameLogWithGame } from "../api";
import { useGame } from "../hooks/queries/useGames";
import { useGameLogMutations } from "../hooks/queries/useGameLogs";
import { usePlatforms } from "../hooks/queries/useGames";
import { useNotify } from "../contexts/NotificationContext";
import Modal from "./ui/Modal";
import LoadingSpinner from "./LoadingSpinner";

interface CreateOrEditGameLogPopupProps {
    closePopup: () => void;
    viewUpdatedLog: () => void;
    /** The existing log, when editing. */
    gamelog?: GameLogWithGame | null;
    /** The game to log, when creating. */
    gameID?: number;
    editing: boolean;
}

const CreateOrEditGameLogPopup: React.FC<CreateOrEditGameLogPopupProps> = ({
    closePopup,
    viewUpdatedLog,
    gamelog,
    editing,
    gameID,
}) => {
    const notify = useNotify();
    const { save } = useGameLogMutations();
    const { data: platforms } = usePlatforms();

    // React Query rather than a bespoke effect per popup, so the game is
    // already in cache from the list that opened this
    const resolvedGameId = gamelog?.gameId ?? gameID;
    const { data: game } = useGame(resolvedGameId);

    const [loadingCreateOrEdit, setLoadingCreateOrEdit] = useState(false);

    // Input values
    const [statusInput, setStatusInput] = useState<string>(
        gamelog?.status || "played"
    );
    const [playedStatusInput, setPlayedStatusInput] = useState<string>(
        gamelog?.playedStatus || "finished"
    );
    const [platformInput, setPlatformInput] = useState<string>(
        gamelog?.platform || "steam"
    );
    const [startDateInput, setStartDateInput] = useState<string>(
        gamelog?.startDate || ""
    );
    const [finishDateInput, setFinishDateInput] = useState<string>(
        gamelog?.finishDate || ""
    );
    const [completeAchievementsInput, setCompleteAchievmentsInput] =
        useState<string>(gamelog?.achievementsCompleted?.toString() || "");
    const [totalAchievementsInput, setTotalAchievmentsInput] = useState<string>(
        gamelog?.achievementsTotal?.toString() || ""
    );
    const [hoursPlayedInput, setHoursPlayedInput] = useState<string>(
        gamelog?.hoursPlayed?.toString() || ""
    );
    const [hoursToBeatInput, setHoursToBeatInput] = useState<string>(
        gamelog?.hoursToBeat?.toString() || ""
    );
    const [ratingInput, setRatingInput] = useState<string>(
        gamelog?.rating?.toString() || "0"
    );

    const popupElement = useRef<HTMLDivElement>(null);

    const handleCreateOrEdit = async () => {
        if (!resolvedGameId) return;
        setLoadingCreateOrEdit(true);

        const input: GameLogInput = {
            status: statusInput as GameStatus,
            // the backend nulls this out unless the status is "played"
            playedStatus: playedStatusInput as PlayedStatus,
            platform: platformInput,
            startDate: startDateInput || null,
            finishDate: finishDateInput || null,
            achievementsCompleted: completeAchievementsInput
                ? Number(completeAchievementsInput)
                : null,
            achievementsTotal: totalAchievementsInput
                ? Number(totalAchievementsInput)
                : null,
            hoursPlayed: hoursPlayedInput ? Number(hoursPlayedInput) : null,
            hoursToBeat: hoursToBeatInput ? Number(hoursToBeatInput) : null,
            rating: Number(ratingInput),
        };

        try {
            // one idempotent upsert; no create-versus-edit branch
            await save.mutateAsync({ gameId: resolvedGameId, input });
            closePopup();
            viewUpdatedLog();
            notify(
                `Successfully ${editing ? "edited" : "created"} game log`,
                "success"
            );
        } catch {
            notify(
                `Failed to ${editing ? "edit" : "create"} game log`,
                "error"
            );
        } finally {
            setLoadingCreateOrEdit(false);
        }
    };

    return (
        <Modal
            onClose={closePopup}
            className="relative flex w-[600px] flex-col gap-6 text-center"
        >
            <div ref={popupElement} className="contents">
                <h2 className="border-b border-b-subtle pb-3 text-xl text-content">
                    {editing ? "Edit" : "Create New"} Log
                </h2>

                <div className="relative flex w-full flex-col gap-4">
                    <h3 className="max-w-[calc(100%-72px)] text-left text-2xl text-content sm:max-w-full">
                        {game?.title}
                        <span className="ml-2.5 text-xl font-light text-content-secondary">
                            {game?.releaseDate?.slice(0, 4)}
                        </span>
                    </h3>

                    <div className="flex w-full">
                        {popupElement.current &&
                        popupElement.current.clientWidth > 480 ? (
                            <div className="absolute right-0 top-0 flex min-h-40 w-16 max-w-[30%] flex-col gap-2 sm:relative sm:w-max">
                                <img
                                    className="w-full rounded-md object-cover"
                                    src={game?.coverUrl ?? ""}
                                    alt={game?.title ?? ""}
                                />
                            </div>
                        ) : (
                            <></>
                        )}
                        <div className="flex flex-grow flex-col gap-3 sm:px-4">
                            <span className="flex gap-3">
                                <div className="flex h-max flex-col items-start gap-0.5">
                                    <p className="text-xs font-semibold text-content">
                                        Status
                                    </p>
                                    <select
                                        className="dropdown-input h-9"
                                        defaultValue={statusInput}
                                        onChange={(e) =>
                                            setStatusInput(
                                                e.currentTarget.value
                                            )
                                        }
                                    >
                                        <option value="played">Played</option>
                                        <option value="playing">Playing</option>
                                        <option value="backlog">Backlog</option>
                                        <option value="wishlist">
                                            Wishlist
                                        </option>
                                    </select>
                                </div>
                                {statusInput === "played" ? (
                                    <div className="flex h-max flex-col items-start gap-0.5">
                                        <p className="text-xs font-semibold text-content">
                                            Played Status
                                        </p>
                                        <select
                                            className="dropdown-input h-9"
                                            defaultValue={playedStatusInput}
                                            onChange={(e) =>
                                                setPlayedStatusInput(
                                                    e.currentTarget.value
                                                )
                                            }
                                        >
                                            <option value="finished">
                                                Finished
                                            </option>
                                            <option value="mastered">
                                                Mastered
                                            </option>
                                            <option value="shelved">
                                                Shelved
                                            </option>
                                            <option value="retired">
                                                Retired
                                            </option>
                                        </select>
                                    </div>
                                ) : (
                                    <></>
                                )}
                                <div className="flex h-max flex-col items-start gap-0.5">
                                    <span className="flex gap-1.5">
                                        <p className="text-xs font-semibold text-content">
                                            Platform
                                        </p>
                                        <i
                                            className={`${
                                                (platforms ?? []).find(
                                                    (platform) =>
                                                        platform.slug ===
                                                        platformInput
                                                )?.iconClass
                                            } text-xs text-content`}
                                        ></i>
                                    </span>
                                    <select
                                        className="dropdown-input h-9"
                                        defaultValue={platformInput}
                                        onChange={(e) =>
                                            setPlatformInput(
                                                e.currentTarget.value
                                            )
                                        }
                                    >
                                        {(platforms ?? []).map((platform) => (
                                            <option
                                                key={platform.slug}
                                                value={platform.slug}
                                            >
                                                {platform.displayName}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </span>
                            <span className="flex gap-3">
                                <div className="flex h-max flex-col items-start gap-0.5">
                                    <p className="text-xs font-semibold text-content">
                                        Start
                                    </p>

                                    <input
                                        type="date"
                                        className="date-input h-9"
                                        defaultValue={startDateInput}
                                        onChange={(e) =>
                                            setStartDateInput(
                                                e.currentTarget.value
                                            )
                                        }
                                    />
                                </div>
                                <div className="flex h-max flex-col items-start gap-0.5">
                                    <p className="text-xs font-semibold text-content">
                                        Finish
                                    </p>

                                    <input
                                        type="date"
                                        className="date-input h-9"
                                        defaultValue={finishDateInput}
                                        onChange={(e) =>
                                            setFinishDateInput(
                                                e.currentTarget.value
                                            )
                                        }
                                    />
                                </div>
                            </span>
                            <span className="flex gap-3">
                                <div className="flex h-max flex-col items-start gap-0.5">
                                    <span className="flex gap-1.5">
                                        <p className="text-xs font-semibold text-content">
                                            Achievements
                                        </p>
                                        <i className="fas fa-trophy text-xs text-gold"></i>
                                    </span>

                                    <span className="flex gap-1">
                                        <input
                                            type="text"
                                            className="text-input w-11"
                                            defaultValue={
                                                completeAchievementsInput
                                            }
                                            placeholder="0"
                                            onChange={(e) =>
                                                setCompleteAchievmentsInput(
                                                    e.currentTarget.value
                                                        .toString()
                                                        .replace(/[^0-9.]/g, "")
                                                )
                                            }
                                        />
                                        <p className="text-2xl font-extralight text-content">
                                            /
                                        </p>
                                        <input
                                            type="text"
                                            className="text-input w-11"
                                            defaultValue={
                                                totalAchievementsInput
                                            }
                                            placeholder="123"
                                            onChange={(e) =>
                                                setTotalAchievmentsInput(
                                                    e.currentTarget.value
                                                        .toString()
                                                        .replace(/[^0-9.]/g, "")
                                                )
                                            }
                                        />
                                    </span>
                                </div>
                                <div className="flex h-max flex-col items-start gap-0.5">
                                    <p className="text-xs font-semibold text-content">
                                        Hours Played
                                    </p>

                                    <input
                                        type="text"
                                        className="text-input w-24"
                                        defaultValue={hoursPlayedInput}
                                        placeholder="0"
                                        onChange={(e) =>
                                            setHoursPlayedInput(
                                                e.currentTarget.value
                                                    .toString()
                                                    .replace(/[^0-9.]/g, "")
                                            )
                                        }
                                    />
                                </div>
                                <div className="flex h-max flex-col items-start gap-0.5">
                                    <p className="text-xs font-semibold text-content">
                                        Hours To Beat
                                    </p>

                                    <input
                                        type="text"
                                        className="text-input w-24"
                                        defaultValue={hoursToBeatInput}
                                        placeholder="0"
                                        onChange={(e) =>
                                            setHoursToBeatInput(
                                                e.currentTarget.value
                                                    .toString()
                                                    .replace(/[^0-9.]/g, "")
                                            )
                                        }
                                    />
                                </div>
                            </span>
                            <span>
                                <div className="flex flex-col gap-0.5">
                                    <span className="flex justify-between text-xs font-semibold text-content">
                                        <p>1</p>
                                        <p>
                                            Rating ({" "}
                                            {ratingInput === "0"
                                                ? "0 = No Rating"
                                                : ratingInput}{" "}
                                            )
                                        </p>
                                        <p>10</p>
                                    </span>
                                    <input
                                        type="range"
                                        className="range-input w-full"
                                        max="10"
                                        min="0"
                                        step="0.25"
                                        defaultValue={ratingInput}
                                        onChange={(e) =>
                                            setRatingInput(
                                                e.currentTarget.value
                                            )
                                        }
                                    />
                                </div>
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex w-full flex-col justify-center gap-5 sm:flex-row">
                    <button
                        className="button-primary w-full sm:w-1/2"
                        onClick={handleCreateOrEdit}
                    >
                        {editing ? "Save" : "Create"}
                    </button>
                    <button
                        className="button-outline button-outline-default w-full sm:w-1/2"
                        onClick={closePopup}
                    >
                        Cancel
                    </button>
                </div>

                {/* was a nested <dialog>, which is not a valid loading overlay */}
                {loadingCreateOrEdit ? (
                    <div className="absolute top-0 flex size-full items-center justify-center rounded-lg bg-overlay-loading">
                        <LoadingSpinner size="lg" />
                    </div>
                ) : (
                    <></>
                )}
            </div>
        </Modal>
    );
};

export default CreateOrEditGameLogPopup;
