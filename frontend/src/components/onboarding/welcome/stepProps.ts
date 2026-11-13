/** What every step of the welcome is given. */
export interface StepProps {
    titleId: string;
    /** Walks it without saving a thing, for the admin preview. */
    preview: boolean;
    onNext: () => void;
    /** On without a stop in the history, for a step with nothing to ask:
     *  Back from the next one shouldn't land on it and bounce. */
    onPass: () => void;
    /** Out of the welcome altogether, for somewhere it links to. */
    onLeave: () => void;
}

/** A rule's XP from the server's list, so what a step promises is what
 *  it pays. */
export const xpFor = (
    rules: { source: string; xp: number }[] | undefined,
    source: string
): number | undefined => rules?.find((rule) => rule.source === source)?.xp;
