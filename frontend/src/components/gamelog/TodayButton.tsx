import { todayIsoDate } from "../../lib/format";

interface TodayButtonProps {
    /** Which date it fills, so the two read apart to a screen reader. */
    field: string;
    onPick: (today: string) => void;
}

/** Fills a date field with today, which a native picker takes several taps
 *  to reach on a phone. */
const TodayButton = ({ field, onPick }: TodayButtonProps) => (
    <button
        type="button"
        aria-label={`Set ${field} to today`}
        onClick={() => onPick(todayIsoDate())}
        // The hit area grows up into the gap above, not down over the field.
        className="relative cursor-pointer text-label-sm text-brand before:absolute before:-inset-x-2 before:-top-6 before:-bottom-2 before:content-[''] hover:text-brand-hover sm:before:-top-2"
    >
        Today
    </button>
);

export default TodayButton;
