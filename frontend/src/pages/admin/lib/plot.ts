import type { AdminPeriodFigure } from "@playrates/shared";
import { displayTimeZone } from "../../../lib/format";

/** One column of a bar plot. A plain bar is one segment; a stacked bar lists
 *  its parts bottom first. */
export interface PlotBar {
    key: string;
    segments: { key: string; value: number; className: string }[];
}

export const barTotal = (bar: PlotBar): number =>
    bar.segments.reduce((sum, s) => sum + s.value, 0);

/** Never zero, so an empty plot draws flat rather than dividing by it. */
export const plotPeak = (bars: PlotBar[], floor = 0): number =>
    Math.max(1, floor, ...bars.map(barTotal));

/** Which bar a pointer at `x` across a plot `width` wide is over. Clamped, so
 *  the gutters either side still answer. */
export const barIndexAt = (x: number, width: number, count: number): number => {
    if (count === 0 || width <= 0) return 0;
    const index = Math.floor((x / width) * count);
    return Math.min(count - 1, Math.max(0, index));
};

/** "+50% on the 30 days before", the way the rest of the app would say it:
 *  the figure takes colour, the words stay in body ink. `words` carries on
 *  from the figure, or stands alone as a sentence when there is none. */
export const changeWords = (
    figure: AdminPeriodFigure,
    previous: string
): { figure: string; words: string; tone: "up" | "down" | "flat" } => {
    if (figure.change === null) {
        return { figure: "", words: `Up from none the ${previous} before`, tone: "up" };
    }
    const percent = Math.round(Math.abs(figure.change) * 100);
    if (percent === 0) {
        return { figure: "", words: `The same as the ${previous} before`, tone: "flat" };
    }
    return {
        figure: `${figure.change > 0 ? "+" : "\u2212"}${percent}%`,
        words: `on the ${previous} before`,
        tone: figure.change > 0 ? "up" : "down",
    };
};

/** "+3 in 30 days", or "none in 30 days" rather than a plus on a zero. */
export const addedIn = (count: number, range: string): string =>
    count === 0 ? `none in ${range}` : `+${count.toLocaleString("en-GB")} in ${range}`;

export const plural = (count: number, one: string, many = `${one}s`): string =>
    `${count.toLocaleString("en-GB")} ${count === 1 ? one : many}`;

const dayKey = (date: Date, zone: string): string =>
    new Intl.DateTimeFormat("en-CA", {
        timeZone: zone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(date);

export interface DayGroup<T> {
    key: string;
    label: string;
    items: T[];
}

/**
 * Newest-first items, gathered under the day they happened in the viewer's
 * zone. "Today" and "Yesterday" by name, the rest of the week by weekday,
 * anything older by date.
 */
export const groupByDay = <T>(
    items: T[],
    at: (item: T) => string,
    now = new Date(),
    zone = displayTimeZone()
): DayGroup<T>[] => {
    const today = dayKey(now, zone);
    const yesterday = dayKey(new Date(now.getTime() - 86_400_000), zone);
    const weekAgo = now.getTime() - 6 * 86_400_000;

    const groups: DayGroup<T>[] = [];
    for (const item of items) {
        const date = new Date(at(item));
        const key = dayKey(date, zone);
        let group = groups.at(-1);
        if (!group || group.key !== key) {
            const label =
                key === today
                    ? "Today"
                    : key === yesterday
                      ? "Yesterday"
                      : new Intl.DateTimeFormat("en-GB", {
                            timeZone: zone,
                            ...(date.getTime() >= weekAgo
                                ? { weekday: "long", day: "numeric", month: "short" }
                                : { day: "numeric", month: "short", year: "numeric" }),
                        }).format(date);
            group = { key, label, items: [] };
            groups.push(group);
        }
        group.items.push(item);
    }
    return groups;
};

/** Within a day's group the date is already said: today reads as "2h ago",
 *  any other day as the time it happened. */
export const timeInDay = (iso: string, dayLabel: string, zone = displayTimeZone()): string =>
    dayLabel === "Today"
        ? ""
        : new Intl.DateTimeFormat("en-GB", { timeZone: zone, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
