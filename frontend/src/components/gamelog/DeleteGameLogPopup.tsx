import { useState } from "react";
import type { GameLogWithGame } from "../../api";
import { useGameLogMutations } from "../../hooks/queries/useGameLogs";
import { useNotify } from "../../contexts/NotificationContext";
import Modal from "../ui/Modal";

interface DeleteGameLogPopupProps {
    gameLog: GameLogWithGame;
    closePopup: () => void;
}

const DeleteGameLogPopup = ({
    gameLog,
    closePopup,
}: DeleteGameLogPopupProps) => {
    const { remove } = useGameLogMutations();
    const notify = useNotify();
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await remove.mutateAsync(gameLog.gameId);
            notify("Game log successfully deleted", "success");
            closePopup();
        } catch {
            notify("Failed to delete game log", "error");
            setIsDeleting(false);
        }
    };

    return (
        <Modal
            onClose={closePopup}
            labelledBy="delete-log-title"
            className="flex w-[500px] flex-col gap-6 text-center"
        >
            <h2 id="delete-log-title" className="text-xl text-content">
                Delete Log
            </h2>
            <p className="border-t border-t-subtle pt-3 text-content-secondary">
                Are you sure you want to delete your log of{" "}
                <span className="text-content">
                    {gameLog.game?.title ?? "this game"}
                </span>
                ? This cannot be undone.
            </p>
            <div className="flex w-full flex-col justify-center gap-5 sm:flex-row">
                <button
                    className="button-secondary w-full sm:w-1/2"
                    onClick={closePopup}
                >
                    Cancel
                </button>
                <button
                    className="button-danger w-full sm:w-1/2"
                    onClick={handleDelete}
                    disabled={isDeleting}
                >
                    Delete
                </button>
            </div>
        </Modal>
    );
};

export default DeleteGameLogPopup;
