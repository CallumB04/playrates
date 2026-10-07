import type { GameLogSummary } from "@playrates/shared";

export type PickIntent = "edit" | "review";

/** What a press on "your log" opens, from how many logs the game has. */
export type LogTarget =
    | { kind: "editor"; logId?: number; focusReview: boolean }
    | { kind: "picker"; intent: PickIntent };

export const resolveTarget = (
    summary: GameLogSummary | undefined,
    intent: PickIntent
): LogTarget => {
    const logs = summary?.logs ?? [];
    if (logs.length >= 2) return { kind: "picker", intent };
    return {
        kind: "editor",
        // Left to the editor when it's a quick add still on its way back.
        logId: logs[0] && logs[0].id > 0 ? logs[0].id : undefined,
        focusReview: intent === "review",
    };
};
