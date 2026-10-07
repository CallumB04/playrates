import { createContext, useContext } from "react";

export interface LogFlow {
    /** The main "log this / edit your log" press. */
    open: (gameId: number) => void;
    /** Start a log on another console. */
    add: (gameId: number) => void;
    edit: (gameId: number, logId: number, focusReview?: boolean) => void;
    review: (gameId: number) => void;
    /** Someone's logs of a game: yours when no owner is named. */
    view: (
        gameId: number,
        options?: { owner?: string; logId?: number }
    ) => void;
}

export const LogFlowContext = createContext<LogFlow | null>(null);

export const useLogFlow = (): LogFlow => {
    const flow = useContext(LogFlowContext);
    if (!flow) {
        throw new Error("useLogFlow must be used within LogFlowProvider");
    }
    return flow;
};
