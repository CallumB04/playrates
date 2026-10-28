import { useMemo } from "react";
import type { GameLogSummary } from "@playrates/shared";
import { useAuth } from "../../contexts/AuthContext";
import { useAccountForm } from "../../contexts/AccountFormContext";
import { useMyGameLogIds, useQuickAdd } from "../../hooks/queries/useGameLogs";
import { useLogFlow } from "../gamelog/useLogFlow";
import {
    displayStatusFor,
    type DisplayStatus,
} from "../../constants/gameStatus";
import type { TileAction } from "./GameTile";
import { tileActions } from "./tileActions";

/**
 * The viewer's quick actions and status for any game cover, so every list
 * of covers offers the same thing. Logs are ids only: whether a game is
 * logged, not what is in the log.
 */
export const useTileActions = () => {
    const { user } = useAuth();
    const { openLogin } = useAccountForm();
    const flow = useLogFlow();
    const quickAdd = useQuickAdd();
    const { data: myLogIds } = useMyGameLogIds();

    const logByGameId = useMemo(
        () => new Map((myLogIds ?? []).map((log) => [log.gameId, log])),
        [myLogIds]
    );

    const logFor = (gameId: number): GameLogSummary | undefined =>
        logByGameId.get(gameId);

    const actionsFor = (game: { id: number; title: string }): TileAction[] =>
        tileActions(
            game,
            { signedIn: !!user, log: logFor(game.id) },
            {
                signIn: openLogin,
                open: (id) => flow.open(id),
                view: (id) => flow.view(id),
                quickAdd,
            }
        );

    const statusFor = (game: { id: number }): DisplayStatus | null => {
        const log = logFor(game.id);
        return log ? displayStatusFor(log.status, log.playedStatus) : null;
    };

    return { actionsFor, statusFor, logFor };
};
