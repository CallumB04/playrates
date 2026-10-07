import { useState } from "react";
import type { GameLog } from "@playrates/shared";
import { useLogMutations } from "../../hooks/queries/useGameLogs";
import { useNotify } from "../../contexts/NotificationContext";
import ConfirmPopup from "../ui/ConfirmPopup";
import { usePlayedOn } from "./usePlayedOn";

interface DeleteGameLogPopupProps {
    log: GameLog;
    gameTitle?: string;
    /** The game's logs on other consoles, which stay. */
    othersCount?: number;
    /** Dismissed without deleting. */
    closePopup: () => void;
    /** Called instead once the log has gone, for a caller that opened this
     *  from inside something else and wants that closed too. */
    onDeleted?: () => void;
}

const DeleteGameLogPopup = ({
    log,
    gameTitle,
    othersCount = 0,
    closePopup,
    onDeleted,
}: DeleteGameLogPopupProps) => {
    const { remove } = useLogMutations();
    const notify = useNotify();
    const platformName = usePlayedOn()(log).name;
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await remove.mutateAsync(log.id);
            notify("Log deleted", "success");
            (onDeleted ?? closePopup)();
        } catch {
            notify("Couldn't delete that log", "error");
            setIsDeleting(false);
        }
    };

    const title = (
        <span className="font-medium text-content">
            {gameTitle ?? "this game"}
        </span>
    );

    return (
        <ConfirmPopup
            title={
                othersCount > 0 && platformName
                    ? `Delete your ${platformName} log`
                    : "Delete log"
            }
            confirmLabel="Delete"
            isPending={isDeleting}
            body={
                othersCount > 0 ? (
                    /* Say what stays: with several consoles logged, "delete
                       your log" could read as all of them. */
                    <>
                        Your rating, playtime and review for {title}
                        {platformName ? ` on ${platformName}` : ""} go with it.
                        Your{" "}
                        {othersCount === 1
                            ? "other log stays"
                            : `${othersCount} other logs stay`}
                        . This cannot be undone.
                    </>
                ) : (
                    <>
                        Your rating, playtime and review for {title} go with it.
                        This cannot be undone.
                    </>
                )
            }
            onConfirm={() => void handleDelete()}
            onClose={closePopup}
        />
    );
};

export default DeleteGameLogPopup;
