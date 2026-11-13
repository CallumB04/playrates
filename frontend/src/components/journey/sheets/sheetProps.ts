/** What each setup sheet's body is given. */
export interface SheetBodyProps {
    /** Done: closes the sheet, the step ticking off as progress catches up. */
    onDone: () => void;
    /** Skip for now: closes it, the step waiting on home. */
    onSkip: () => void;
}
