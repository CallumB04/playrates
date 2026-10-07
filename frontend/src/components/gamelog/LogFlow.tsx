import { useMemo, useState, type ReactNode } from "react";
import CreateOrEditGameLogPopup from "../CreateOrEditGameLogPopup";
import ViewGameLogPopup from "../ViewGameLogPopup";
import { LogFlowContext, type LogFlow } from "./useLogFlow";

type Open =
    | {
          kind: "editor";
          gameId: number;
          /** null starts a log on another console; undefined opens on the
           *  log that speaks for the game, with the rest a tab away. */
          logId?: number | null;
          focusReview: boolean;
      }
    | { kind: "viewer"; gameId: number; owner?: string; logId?: number }
    | null;

/**
 * Every page opens logs the same way: the editor, with a tab for each
 * console the game is logged on, or the viewer.
 */
export const LogFlowProvider = ({ children }: { children: ReactNode }) => {
    const [current, setCurrent] = useState<Open>(null);
    const flow = useMemo<LogFlow>(
        () => ({
            open: (gameId) =>
                setCurrent({ kind: "editor", gameId, focusReview: false }),
            review: (gameId) =>
                setCurrent({ kind: "editor", gameId, focusReview: true }),
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
        []
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
        </LogFlowContext.Provider>
    );
};
