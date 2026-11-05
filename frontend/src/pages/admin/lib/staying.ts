import type { AdminReturn, AdminReturnPoint } from "@playrates/shared";

/** A share as a whole percent, or null with nobody to divide by. */
export const rate = ({ back, of }: AdminReturn): number | null =>
    of === 0 ? null : Math.round((back / of) * 100);

/**
 * A rate's change on the period before, in points: "+4 pts" rather than a
 * percentage of a percentage, which no one reads right.
 */
export const pointsChange = (
    current: AdminReturn,
    previous: AdminReturn,
    period: string
): { figure: string; words: string; tone: "up" | "down" | "flat" } => {
    const now = rate(current);
    const then = rate(previous);
    if (now === null || then === null) {
        return {
            figure: "",
            words: `Nothing to compare with the ${period} before`,
            tone: "flat",
        };
    }
    const points = now - then;
    if (points === 0) {
        return {
            figure: "",
            words: `The same as the ${period} before`,
            tone: "flat",
        };
    }
    return {
        figure: `${points > 0 ? "+" : "−"}${Math.abs(points)} pts`,
        words: `on the ${period} before`,
        tone: points > 0 ? "up" : "down",
    };
};

/** The curve as far as anyone has got: past the last day someone reached,
 *  there's nothing to draw. */
export const reachedCurve = (curve: AdminReturnPoint[]): AdminReturnPoint[] => {
    let last = curve.length;
    while (last > 0 && curve[last - 1]!.everyone.of === 0) last--;
    return curve.slice(0, last);
};
