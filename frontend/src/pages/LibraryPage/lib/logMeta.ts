import type { GameLogSummary } from "@playrates/shared";
import { formatRatingOutOfTen } from "../../../lib/format";

/**
 * The line under a cover's title for a game you have logged. The rating
 * leads: on a phone the line is cut to fit, and it is the part worth
 * keeping, the platforms being drawn under the cover anyway.
 */
export const logMeta = (
    log: Pick<GameLogSummary, "logs" | "rating"> | undefined
): string | undefined => {
    if (!log) return undefined;
    const parts =
        log.logs.length > 1
            ? ["Your logs", `${log.logs.length} platforms`]
            : ["Your log"];
    if (log.rating !== null) parts.unshift(formatRatingOutOfTen(log.rating));
    return parts.join(" · ");
};
