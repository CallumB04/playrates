import type { GameLogSummary } from "@playrates/shared";
import { STATUS_PRESENTATION } from "../../constants/gameStatus";
import type { TileAction } from "./GameTile";

export interface TileActionHandlers {
    signIn: () => void;
    /** Opens the editor on a new log, or on theirs for an edit. */
    open: (gameId: number) => void;
    view: (gameId: number) => void;
    quickAdd: (
        gameId: number,
        title: string,
        status: "backlog" | "wishlist"
    ) => void;
    addToList: (gameId: number) => void;
}

/** A row rather than an icon: the icons shelve in one tap, and this opens
 *  a choice of lists. */
const addToList = (gameId: number, on: TileActionHandlers): TileAction => ({
    key: "list",
    label: "Add to list",
    onSelect: () => on.addToList(gameId),
});

/**
 * What a cover offers wherever it sits: sign in when signed out; log it or
 * shelve it in one tap when not logged yet; view or edit it once it is; and
 * put it in a list either way.
 * Shelving is not offered on a logged game, where it would overwrite the
 * status it already has.
 */
export const tileActions = (
    game: { id: number; title: string },
    { signedIn, log }: { signedIn: boolean; log: GameLogSummary | undefined },
    on: TileActionHandlers
): TileAction[] => {
    if (!signedIn) {
        return [
            {
                key: "signin",
                label: "Log in to add",
                tone: "primary",
                onSelect: on.signIn,
            },
        ];
    }

    if (log) {
        return [
            {
                key: "view",
                label: log.logs.length > 1 ? "View your logs" : "View your log",
                tone: "primary",
                onSelect: () => on.view(game.id),
            },
            {
                key: "edit",
                // Beside "View your log", "Edit" alone read as editing the game.
                label: log.logs.length > 1 ? "Edit logs" : "Edit log",
                onSelect: () => on.open(game.id),
            },
            addToList(game.id, on),
        ];
    }

    return [
        {
            key: "log",
            label: "Create log",
            tone: "primary",
            onSelect: () => on.open(game.id),
        },
        addToList(game.id, on),
        {
            key: "backlog",
            label: "Add to backlog",
            icon: STATUS_PRESENTATION.backlog.icon,
            onSelect: () => on.quickAdd(game.id, game.title, "backlog"),
            doneLabel: "In your backlog",
            doneTone: STATUS_PRESENTATION.backlog.onMediaTone,
        },
        {
            key: "wishlist",
            label: "Add to wishlist",
            icon: STATUS_PRESENTATION.wishlist.icon,
            onSelect: () => on.quickAdd(game.id, game.title, "wishlist"),
            doneLabel: "On your wishlist",
            doneTone: STATUS_PRESENTATION.wishlist.onMediaTone,
        },
    ];
};
