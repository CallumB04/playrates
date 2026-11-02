import { ApiError } from "../../api";
import { useAuth } from "../../contexts/AuthContext";
import { useNotify } from "../../contexts/NotificationContext";
import { useProgress, useSetStyle } from "../../hooks/queries/useProgress";
import { lookOf } from "./shopItems";

/** Whether an item is worn now, and how to put it on. Slots, reactions and
 *  shields aren't worn: they simply count. */
export const useWear = () => {
    const { user } = useAuth();
    const { data } = useProgress();
    const setStyle = useSetStyle();
    const notify = useNotify();
    const failed = (error: unknown) =>
        notify(
            error instanceof ApiError ? error.message : "Couldn’t change that",
            "error"
        );

    const wearing = (item: string): boolean | null => {
        const look = lookOf(item);
        switch (look.kind) {
            case "frame":
                return data?.frame === look.frame;
            case "theme":
                return data?.look.cardTheme === look.theme;
            case "font":
                return (user?.nameFont ?? "default") === look.font;
            case "colour":
                return (user?.nameColour ?? "default") === look.colour;
            default:
                return null;
        }
    };

    const wear = (item: string, onDone?: () => void) => {
        const look = lookOf(item);
        const done = { onSuccess: onDone, onError: failed };
        if (look.kind === "frame") setStyle.mutate({ frame: look.frame }, done);
        else if (look.kind === "theme")
            setStyle.mutate({ cardTheme: look.theme }, done);
        else if (look.kind === "font")
            setStyle.mutate({ nameFont: look.font }, done);
        else if (look.kind === "colour")
            setStyle.mutate({ nameColour: look.colour }, done);
    };

    return { wearing, wear, pending: setStyle.isPending };
};
