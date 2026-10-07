const round = (hours: number) => Math.round(hours * 100) / 100;

const HOURS_THEN_MINUTES =
    /^(\d+(?:\.\d+)?)\s*h(?:ou)?r?s?\s*(?:(\d{1,2})\s*(?:m(?:in(?:ute)?s?)?)?)?$/;
const MINUTES = /^(\d+)\s*m(?:in(?:ute)?s?)?$/;
const CLOCK = /^(\d+):([0-5]\d)$/;

/**
 * Hours however they're written: "12", "12.5", "12,5", "12h", "12h30",
 * "12:30", "1h 30m", "90 min". Null when left empty; NaN when it can't be
 * read, so the field can say so rather than quietly saving nothing.
 */
export const parseHours = (input: string): number | null => {
    const text = input.trim().toLowerCase().replace(",", ".");
    if (text === "") return null;
    if (/^\d+(?:\.\d+)?$/.test(text)) return Number(text);

    const clock = CLOCK.exec(text);
    if (clock) return round(Number(clock[1]) + Number(clock[2]) / 60);

    const hours = HOURS_THEN_MINUTES.exec(text);
    if (hours) return round(Number(hours[1]) + Number(hours[2] ?? 0) / 60);

    const minutes = MINUTES.exec(text);
    if (minutes) return round(Number(minutes[1]) / 60);

    return Number.NaN;
};
