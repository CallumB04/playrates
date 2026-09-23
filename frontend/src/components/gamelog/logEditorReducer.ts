import type { GameLogInput, GameStatus, PlayedStatus } from "@playrates/shared";
import type { GameLogWithGame } from "../../api";

export interface LogDraft {
    status: GameStatus;
    playedStatus: PlayedStatus | null;
    rating: number | null;
    hoursPlayed: string;
    hoursToBeat: string;
    startDate: string;
    finishDate: string;
    /** The family, derived from `system` — never picked directly. */
    platform: string;
    system: string;
    achievementsCompleted: string;
    achievementsTotal: string;
    reviewBody: string;
    reviewIsPublic: boolean;
}

export const emptyDraft: LogDraft = {
    status: "played",
    playedStatus: null,
    rating: null,
    hoursPlayed: "",
    hoursToBeat: "",
    startDate: "",
    finishDate: "",
    platform: "",
    system: "",
    achievementsCompleted: "",
    achievementsTotal: "",
    reviewBody: "",
    reviewIsPublic: true,
};

export type LogAction =
    | { type: "set"; field: keyof LogDraft; value: string | boolean | null }
    | { type: "status"; value: GameStatus }
    | { type: "system"; value: string; platform: string }
    | { type: "playedStatus"; value: PlayedStatus | null }
    | { type: "rating"; value: number | null }
    | {
          type: "hydrate";
          log: GameLogWithGame | null;
          review?: { body: string; isPublic: boolean } | null;
      };

const numberOrEmpty = (value: number | null): string =>
    value === null ? "" : String(value);

export const logReducer = (state: LogDraft, action: LogAction): LogDraft => {
    switch (action.type) {
        case "status":
            return {
                ...state,
                status: action.value,
                // A substatus only means anything on a played log.
                playedStatus:
                    action.value === "played" ? state.playedStatus : null,
            };

        case "playedStatus":
            return { ...state, playedStatus: action.value };

        // Both at once: the family is a function of the machine, so letting
        // them drift would put a log on a PS5 under "Xbox".
        case "system":
            return {
                ...state,
                system: action.value,
                platform: action.platform,
            };

        case "rating":
            return { ...state, rating: action.value };

        case "set":
            return { ...state, [action.field]: action.value } as LogDraft;

        case "hydrate": {
            const { log, review } = action;
            if (!log) {
                return {
                    ...emptyDraft,
                    reviewBody: review?.body ?? "",
                    reviewIsPublic: review?.isPublic ?? true,
                };
            }
            return {
                status: log.status,
                playedStatus: log.playedStatus,
                rating: log.rating,
                hoursPlayed: numberOrEmpty(log.hoursPlayed),
                hoursToBeat: numberOrEmpty(log.hoursToBeat),
                startDate: log.startDate ?? "",
                finishDate: log.finishDate ?? "",
                platform: log.platform ?? "",
                system: log.system ?? "",
                achievementsCompleted: numberOrEmpty(log.achievementsCompleted),
                achievementsTotal: numberOrEmpty(log.achievementsTotal),
                reviewBody: review?.body ?? "",
                reviewIsPublic: review?.isPublic ?? true,
            };
        }
    }
};

const toNumber = (value: string): number | null => {
    const trimmed = value.trim();
    if (trimmed === "") return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
};

const toDate = (value: string): string | null =>
    /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;

/** The draft as the API wants it. Empty strings become nulls, not zeroes. */
export const toGameLogInput = (draft: LogDraft): GameLogInput => ({
    status: draft.status,
    playedStatus: draft.status === "played" ? draft.playedStatus : null,
    rating: draft.rating,
    hoursPlayed: toNumber(draft.hoursPlayed),
    hoursToBeat: toNumber(draft.hoursToBeat),
    startDate: toDate(draft.startDate),
    finishDate: toDate(draft.finishDate),
    platform: draft.platform || null,
    system: draft.system || null,
    achievementsCompleted: toNumber(draft.achievementsCompleted),
    achievementsTotal: toNumber(draft.achievementsTotal),
});

/** Mirrors the database CHECKs, so the form can point at the bad field
 *  instead of surfacing a 422. */
export const validateDraft = (draft: LogDraft): string | null => {
    const completed = toNumber(draft.achievementsCompleted);
    const total = toNumber(draft.achievementsTotal);
    if (completed !== null && total !== null && completed > total) {
        return "Completed achievements can't exceed the total.";
    }

    const start = toDate(draft.startDate);
    const finish = toDate(draft.finishDate);
    if (start && finish && finish < start) {
        return "A game can't be finished before it was started.";
    }

    return null;
};

export const achievementFraction = (draft: LogDraft): number | null => {
    const completed = toNumber(draft.achievementsCompleted);
    const total = toNumber(draft.achievementsTotal);
    if (completed === null || !total) return null;
    return Math.min(1, Math.max(0, completed / total));
};
