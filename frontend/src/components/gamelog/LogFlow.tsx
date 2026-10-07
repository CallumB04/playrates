import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useMyGameLogIds } from "../../hooks/queries/useGameLogs";
import CreateOrEditGameLogPopup from "../CreateOrEditGameLogPopup";
import ViewGameLogPopup from "../ViewGameLogPopup";
import LogPickerSheet from "./LogPickerSheet";
import { resolveTarget, type PickIntent } from "./logTarget";
import { LogFlowContext, type LogFlow } from "./useLogFlow";

type Open =
    | {
          kind: "editor";
          gameId: number;
          /** null starts a log on another console; undefined is "whichever
           *  this game has", for an editor opened before the logs are known. */
          logId?: number | null;
          focusReview: boolean;
      }
    | { kind: "viewer"; gameId: number; owner?: string; logId?: number }
    | { kind: "picker"; gameId: number; intent: PickIntent }
    | null;

/**
 * Every page opens logs the same way. With a log per console, "edit your log"
 * can mean one of several, and each page working that out on its own is how
 * they drift; here it is decided once.
 */
export const LogFlowProvider = ({ children }: { children: ReactNode }) => {
    const [current, setCurrent] = useState<Open>(null);
    const { data: summaries } = useMyGameLogIds();

    const summaryOf = useCallback(
        (gameId: number) => summaries?.find((s) => s.gameId === gameId),
        [summaries]
    );

    const go = useCallback(
        (gameId: number, intent: PickIntent) => {
            const target = resolveTarget(summaryOf(gameId), intent);
            setCurrent(
                target.kind === "picker"
                    ? { kind: "picker", gameId, intent }
                    : {
                          kind: "editor",
                          gameId,
                          logId: target.logId,
                          focusReview: target.focusReview,
                      }
            );
        },
        [summaryOf]
    );

    const flow = useMemo<LogFlow>(
        () => ({
            open: (gameId) => go(gameId, "edit"),
            review: (gameId) => go(gameId, "review"),
            add: (gameId) =>
                setCurrent({
                    kind: "editor",
                    gameId,
                    logId: null,
                    focusReview: false,
                }),
            edit: (gameId, logId, focusReview = false) =>
                setCurrent({ kind: "editor", gameId, logId, focusReview }),
            view: (gameId, options) =>
                setCurrent({ kind: "viewer", gameId, ...options }),
        }),
        [go]
    );

    const close = () => setCurrent(null);

    return (
        <LogFlowContext.Provider value={flow}>
            {children}
            {current?.kind === "editor" && (
                // Keyed, so moving straight from one log to another starts
                // the form afresh rather than keeping the last one's draft.
                <CreateOrEditGameLogPopup
                    key={`${current.gameId}:${current.logId}`}
                    gameId={current.gameId}
                    logId={current.logId}
                    focusReview={current.focusReview}
                    onClose={close}
                />
            )}
            {current?.kind === "viewer" && (
                <ViewGameLogPopup
                    key={`${current.gameId}:${current.owner}`}
                    gameId={current.gameId}
                    ownerUsername={current.owner}
                    initialLogId={current.logId}
                    onClose={close}
                />
            )}
            {current?.kind === "picker" && (
                <LogPickerSheet
                    gameId={current.gameId}
                    intent={current.intent}
                    onClose={close}
                />
            )}
        </LogFlowContext.Provider>
    );
};
