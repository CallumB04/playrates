import { useState } from "react";
import type { GameLogWithGame } from "../../api";
import { useGameLogMutations } from "../../hooks/queries/useGameLogs";
import { useNotify } from "../../contexts/NotificationContext";
import ConfirmPopup from "../ui/ConfirmPopup";

interface DeleteGameLogPopupProps {
    gameLog: GameLogWithGame;
    /** Dismissed without deleting. */
    closePopup: () => void;
    /** Called instead once the log has gone, for a caller that opened this
     *  from inside something else and wants that closed too. */
    onDeleted?: () => void;
}

const DeleteGameLogPopup = ({
    gameLog,
    closePopup,
    onDeleted,
}: DeleteGameLogPopupProps) => {
    const { remove } = useGameLogMutations();
    const notify = useNotify();
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await remove.mutateAsync(gameLog.gameId);
            notify("Log deleted", "success");
            (onDeleted ?? closePopup)();
        } catch {
            notify("Couldn't delete that log", "error");
            setIsDeleting(false);
        }
    };

    return (
        <ConfirmPopup
            title="Delete log"
            confirmLabel="Delete"
            isPending={isDeleting}
            body={
                <>
                    Your rating, playtime and review for{" "}
                    <span className="font-medium text-content">
                        {gameLog.game?.title ?? "this game"}
                    </span>{" "}
                    go with it. This cannot be undone.
                </>
            }
            onConfirm={() => void handleDelete()}
            onClose={closePopup}
        />
    );
};

export default DeleteGameLogPopup;
