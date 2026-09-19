import { useEffect, useState } from "react";
import { deleteGameLog, fetchGameById, GameLog } from "../api";
import ClosePopupIcon from "./ClosePopupIcon";

interface DeleteGameLogPopupProps {
    closePopup: () => void;
    refreshLogs: () => void;
    runNotification: (
        text: string,
        type: "success" | "error" | "pending"
    ) => void;
    gameLog: GameLog;
    userID: number;
}

const DeleteGameLogPopup: React.FC<DeleteGameLogPopupProps> = ({
    closePopup,
    refreshLogs,
    runNotification,
    gameLog,
    userID,
}) => {
    const [gameName, setGameName] = useState<string>("");

    // fetch game data from ID in game log, and set state when fetched
    useEffect(() => {
        const fetchGameFromLog = async () => {
            const fetchedGame = await fetchGameById(gameLog.id);

            if (fetchedGame) {
                setGameName(fetchedGame.title);
            }
        };

        fetchGameFromLog();
    }, []);

    // confirm game log deletion, refetch game logs and close popup
    const handleDelete = async () => {
        const request = await deleteGameLog(userID, gameLog.id);

        if (request) {
            closePopup();
            refreshLogs();
            runNotification("Successfully deleted game log", "success");
        } else {
            runNotification("Failed to delete game log", "error");
        }
    };

    return (
        <dialog className="popup-backdrop" onMouseDown={closePopup}>
            <div
                className="popup popup-default flex flex-col gap-6 text-center"
                onMouseDown={(event) => event.stopPropagation()}
            >
                <div className="flex w-full flex-col gap-3">
                    <h2 className="text-xl text-content">Delete Log</h2>
                    <p className="max-w-[40ch] border-t border-t-subtle pt-3 font-light text-content-secondary">
                        Are you sure you want to delete{" "}
                        <span className="font-normal text-content">
                            {gameName}
                        </span>{" "}
                        from your profile? This cannot be undone.
                    </p>
                </div>
                <div className="flex w-full flex-col justify-center gap-5 sm:flex-row">
                    <button
                        className="button-danger w-full sm:w-1/2"
                        onClick={handleDelete}
                    >
                        Delete
                    </button>
                    <button
                        className="button-outline button-outline-default w-full sm:w-1/2"
                        onClick={closePopup}
                    >
                        Cancel
                    </button>
                </div>

                <ClosePopupIcon onClick={closePopup} />
            </div>
        </dialog>
    );
};

export default DeleteGameLogPopup;
