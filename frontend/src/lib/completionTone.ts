/** How far through a game's achievements someone is: red under a quarter,
 *  orange to three quarters, green past that, and gold for every one. */
export type CompletionTier = "low" | "mid" | "high" | "full";

/* Complete class strings, because Tailwind emits what it finds literally. */
const TONES: Record<
    CompletionTier,
    { text: string; fill: string; colour: string; sheen: string }
> = {
    low: {
        text: "text-completion-low-text",
        fill: "bg-completion-low",
        colour: "var(--completion-low)",
        sheen: "var(--completion-low)",
    },
    mid: {
        text: "text-completion-mid-text",
        fill: "bg-completion-mid",
        colour: "var(--completion-mid)",
        sheen: "var(--completion-mid)",
    },
    high: {
        text: "text-completion-high-text",
        fill: "bg-completion-high",
        colour: "var(--completion-high)",
        sheen: "var(--completion-high)",
    },
    // The podium's gold, which reads as small text by day and by night.
    // Only a finished set keeps the ring's sweep to the bright end.
    full: {
        text: "text-medal-gold",
        fill: "bg-medal-gold",
        colour: "var(--medal-gold)",
        sheen: "var(--status-mastered-sheen)",
    },
};

/** The band for a fraction, 0 to 1. By the whole percentage shown, so a
 *  figure reading "100%" is always gold and one reading "25%" never red. */
export const completionTier = (fraction: number): CompletionTier => {
    const percent = Math.round(Math.min(1, Math.max(0, fraction)) * 100);
    if (percent === 100) return "full";
    if (percent < 25) return "low";
    if (percent < 75) return "mid";
    return "high";
};

/** A fraction's colours: `text` for a figure, `fill` for a bar, and
 *  `colour` and `sheen` as CSS values for the ring's stroke. */
export const completionTone = (fraction: number) =>
    TONES[completionTier(fraction)];
