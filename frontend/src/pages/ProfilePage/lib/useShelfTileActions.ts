import { useMemo } from "react";
import { Eye } from "lucide-react";
import type { ShelfEntry } from "@playrates/shared";
import type { TileAction } from "../../../components/game/GameTile";
import { useLogFlow } from "../../../components/gamelog/useLogFlow";
import { useAuth } from "../../../contexts/AuthContext";
import { useMyGameLogIds } from "../../../hooks/queries/useGameLogs";

/** What a tile on someone's shelf offers, which turns on whose shelf it is
 *  and whether the viewer has logged the game too. */
export const useShelfTileActions = (username: string, isMyAccount: boolean) => {
    const { user: currentUser } = useAuth();
    const flow = useLogFlow();
    const { data: myLogIds } = useMyGameLogIds();

    const myLogGameIds = useMemo(
        () => new Set((myLogIds ?? []).map((entry) => entry.gameId)),
        [myLogIds]
    );

    const buildTileActions = (entry: ShelfEntry): TileAction[] => {
        const { gameId } = entry;
        const actions: TileAction[] = [
            {
                key: "view",
                // Beside "My log" on someone else's shelf, "View log" said
                // nothing of whose.
                label: isMyAccount
                    ? entry.logs.length > 1
                        ? "View logs"
                        : "View log"
                    : entry.logs.length > 1
                      ? "Their logs"
                      : "Their log",
                tone: "primary",
                onSelect: () => flow.view(gameId, { owner: username }),
            },
        ];

        // Signed out, theirs is the only log on offer to a phone.
        if (!currentUser) return [{ ...actions[0]!, standing: Eye }];

        if (isMyAccount) {
            actions.push({
                key: "edit",
                label: entry.logs.length > 1 ? "Edit logs" : "Edit log",
                onSelect: () => flow.open(gameId),
            });
        } else if (myLogGameIds.has(gameId)) {
            actions.push({
                key: "myLog",
                label: "My log",
                onSelect: () => flow.view(gameId),
            });
        } else {
            actions.push({
                key: "add",
                label: "Log it",
                onSelect: () => flow.open(gameId),
            });
        }
        actions.push({
            key: "list",
            label: "Add to list",
            onSelect: () => flow.addToList(gameId),
        });

        return actions;
    };

    return {
        buildTileActions,
        /** Undefined until the viewer's own logs have loaded. */
        myLogGameIds: myLogIds ? myLogGameIds : undefined,
    };
};
