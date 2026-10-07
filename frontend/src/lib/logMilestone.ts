const MILESTONES = new Set([10, 25, 50, 100, 250, 500]);

/**
 * What saving a new log says when it lands on a round number: the first
 * game, then the counts worth marking. Null for an ordinary save, which
 * keeps its plain "Entry saved"; a milestone that fired every time would
 * stop being one.
 */
export const logMilestone = (count: number): string | null => {
    if (count === 1) return "Your first game is on your shelves";
    if (MILESTONES.has(count) || (count >= 1000 && count % 1000 === 0)) {
        return `That's ${count.toLocaleString("en-GB")} games on your shelves`;
    }
    return null;
};
