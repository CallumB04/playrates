import {
    lazy,
    Suspense,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import { whenIdle } from "../../lib/whenIdle";
import { LogFlowContext, type LogFlow } from "./useLogFlow";

/* The editor and viewer are most of what a page would otherwise carry for
   a popup it may never open. Fetched once the page is idle, so the first
   one opens without a wait. */
const loadEditor = () => import("../CreateOrEditGameLogPopup");
const CreateOrEditGameLogPopup = lazy(loadEditor);
const ViewGameLogPopup = lazy(() => import("../ViewGameLogPopup"));
const AddToListPopup = lazy(() => import("../lists/AddToListPopup"));

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
    | { kind: "lists"; gameId: number }
    | null;

/**
 * Every page opens logs the same way: the editor, with a tab for each
 * console the game is logged on, or the viewer. Adding a game to a list
 * opens from here too, so every cover offers it alike.
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
            addToList: (gameId) => setCurrent({ kind: "lists", gameId }),
        }),
        []
    );

    const close = () => setCurrent(null);

    useEffect(() => whenIdle(() => void loadEditor()), []);

    return (
        <LogFlowContext.Provider value={flow}>
            {children}
            <Suspense fallback={null}>
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
                {current?.kind === "lists" && (
                    <AddToListPopup gameId={current.gameId} onClose={close} />
                )}
            </Suspense>
        </LogFlowContext.Provider>
    );
};
