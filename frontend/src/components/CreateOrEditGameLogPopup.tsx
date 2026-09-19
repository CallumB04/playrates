import { useEffect, useRef, useState } from "react";
import {
    createNewGameLog,
    editGameLog,
    fetchGameById,
    Game,
    GameLog,
} from "../api";
import ClosePopupIcon from "./ClosePopupIcon";
import LoadingSpinner from "./LoadingSpinner";
import { gamePlatforms } from "../App";

interface CreateOrEditGameLogPopupProps {
    closePopup: () => void;
    viewUpdatedLog: (log: GameLog) => void;
    gamelog?: GameLog | null; // associated game log (if editing)
    gameID?: number; // if creating, allows for fetching of game
    editing: boolean; // true: editing, false: creating new
    userID: number;
    runNotification: (
        text: string,
        type: "success" | "error" | "pending"
    ) => void;
}

const CreateOrEditGameLogPopup: React.FC<CreateOrEditGameLogPopupProps> = ({
    closePopup,
    viewUpdatedLog,
    gamelog,
    editing,
    gameID,
    userID,
    runNotification,
}) => {
    const [game, setGame] = useState<Game | undefined>(undefined);
    const [loadingCreateOrEdit, setLoadingCreateOrEdit] =
        useState<boolean>(false);

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

    // fetch game data from ID in game log, and set state when fetched
    useEffect(() => {
        const fetchGameFromLog = async () => {
            const gameIdToFetch = gamelog ? gamelog.id : gameID!;
            const fetchedGame = await fetchGameById(gameIdToFetch);

            if (fetchedGame) {
                setGame(fetchedGame);
            }
        };

        fetchGameFromLog();
    }, []);

    const handleCreateOrEdit = async () => {
        setLoadingCreateOrEdit(true);

        // create new game log, all optional inputs are only added if present
        const logData: GameLog = {
            id: gameID || gameID === 0 ? gameID : gamelog!.id,
            status: statusInput,
            playedStatus: playedStatusInput,
            platform: platformInput,
            ...(startDateInput && { startDate: startDateInput }),
            ...(finishDateInput && { finishDate: finishDateInput }),
            ...(completeAchievementsInput && {
                achievementsCompleted: Number(completeAchievementsInput),
            }),
            ...(totalAchievementsInput && {
                achievementsTotal: Number(totalAchievementsInput),
            }),
            ...(hoursPlayedInput && { hoursPlayed: Number(hoursPlayedInput) }),
            ...(hoursToBeatInput && { hoursToBeat: Number(hoursToBeatInput) }),
            rating: Number(ratingInput),
        };

        const request = editing
            ? await editGameLog(
                  userID,
                  gameID || gameID === 0 ? gameID : gamelog!.id,
                  logData
              )
            : await createNewGameLog(userID, logData);

        if (request) {
            closePopup();
            viewUpdatedLog(logData); // refetch game logs, open view popup, etc
            runNotification(
                `Successfully ${editing ? "edited" : "created"} game log`,
                "success"
            );
        } else {
            runNotification(
                `Failed to ${editing ? "edit" : "create"} game log`,
                "error"
            );
        }

        setLoadingCreateOrEdit(false);
    };

    return (
        <dialog className="popup-backdrop" onMouseDown={closePopup}>
            <div
                className="popup popup-default relative flex w-[600px] flex-col gap-6 text-center"
                onMouseDown={(event) => event.stopPropagation()}
                ref={popupElement}
            >
                <h2 className="border-b border-b-subtle pb-3 text-xl text-content">
                    {editing ? "Edit" : "Create New"} Log
                </h2>

                <div className="relative flex w-full flex-col gap-4">
                    <h3 className="max-w-[calc(100%-72px)] text-left text-2xl text-content sm:max-w-full">
                        {game?.title}
                        <span className="ml-2.5 text-xl font-light text-content-secondary">
                            {game?.releaseDate.slice(0, 4)}
                        </span>
                    </h3>

                    <div className="flex w-full">
                        {popupElement.current &&
                        popupElement.current.clientWidth > 480 ? (
                            <div className="absolute right-0 top-0 flex min-h-40 w-16 max-w-[30%] flex-col gap-2 sm:relative sm:w-max">
                                <img
                                    className="w-full rounded-md object-cover"
                                    src={`/PlayRates/assets/game-covers/${game?.id}.png`}
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
                                                gamePlatforms.find(
                                                    (platform) =>
                                                        platform.name ===
                                                        platformInput
                                                )?.icon
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
                                        {gamePlatforms.map((platform) => (
                                            <option
                                                key={platform.name}
                                                value={platform.name}
                                            >
                                                {platform.display}
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

                <ClosePopupIcon onClick={closePopup} />

                {loadingCreateOrEdit ? (
                    <dialog className="absolute top-0 flex size-full items-center justify-center rounded-lg bg-overlay-loading">
                        <LoadingSpinner size="lg" />
                    </dialog>
                ) : (
                    <></>
                )}
            </div>
        </dialog>
    );
};

export default CreateOrEditGameLogPopup;
