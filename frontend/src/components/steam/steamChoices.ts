import type {
    PlayedStatus,
    SteamImportInput,
    SteamImportResult,
    SteamLibraryItem,
} from "@playrates/shared";
import { formatCount } from "../../lib/format";

export type SteamChoice = "played" | "playing" | "backlog" | "skip";

/** What one game goes in as. */
export interface SteamDraft {
    choice: SteamChoice;
    rating: number | null;
    /** Kept while the game is set to something else, so flicking it to
     *  Backlog and back doesn't lose it; only sent for Played. */
    playedStatus: PlayedStatus | null;
}

/** Where a game's achievements have got to. */
export type AchievementState =
    | { kind: "loading" }
    | { kind: "done"; value: { total: number; unlocked: number } | null }
    | { kind: "failed" }
    | { kind: "private" };

export type Achievements = Map<number, AchievementState>;

/** The library with each game here once, as its first, most played app:
 *  an import names a game once, and an API from before it sorted that out
 *  itself could send it twice. */
export const onePerGame = (items: SteamLibraryItem[]): SteamLibraryItem[] => {
    const seen = new Set<number>();
    return items.filter((item) => {
        if (!item.game) return true;
        if (seen.has(item.game.id)) return false;
        seen.add(item.game.id);
        return true;
    });
};

/** A game we can add: matched here and not yet on the shelves. */
export const isAddable = (item: SteamLibraryItem) =>
    !!item.game && !item.logged;

/** What each game starts as: its suggestion, unrated, with no ending. */
export const startingDrafts = (
    items: SteamLibraryItem[]
): Map<number, SteamDraft> =>
    new Map(
        items
            .filter(isAddable)
            .map((item) => [
                item.game!.id,
                { choice: item.suggested, rating: null, playedStatus: null },
            ])
    );

/** The games to ask Steam about, in the order they're shown: the ones to
 *  add, then the ones already logged with achievements to fill. */
export const achievementsToAsk = (items: SteamLibraryItem[]): number[] => [
    ...items
        .filter((item) => isAddable(item) && item.achievements)
        .map((item) => item.appid),
    ...items
        .filter((item) => item.logged && item.fills?.achievements)
        .map((item) => item.appid),
];

const loaded = (achievements: Achievements, appid: number) => {
    const state = achievements.get(appid);
    return state?.kind === "done" ? state.value : null;
};

/** The import, from the drafts: skipped games left out, hours only where
 *  they were played, and the ending only on the played shelf. */
export const importFrom = (
    items: SteamLibraryItem[],
    drafts: Map<number, SteamDraft>,
    achievements: Achievements = new Map()
): SteamImportInput["games"] =>
    items.flatMap((item) => {
        const id = item.game?.id;
        const draft = id === undefined ? undefined : drafts.get(id);
        if (id === undefined || !draft || draft.choice === "skip") return [];
        const status = draft.choice;
        const got = loaded(achievements, item.appid);
        return [
            {
                gameId: id,
                status,
                hours:
                    status !== "backlog" && item.hours > 0 ? item.hours : null,
                rating: draft.rating,
                playedStatus: status === "played" ? draft.playedStatus : null,
                achievementsTotal: got?.total ?? null,
                achievementsCompleted: got?.unlocked ?? null,
            },
        ];
    });

/** What Steam can fill in on one logged game, as far as is known now:
 *  achievements count once they've loaded and found some. */
export const fillsFor = (
    item: SteamLibraryItem,
    achievements: Achievements
): { platform: boolean; hours: boolean; achievements: boolean } | null => {
    if (!item.logged || !item.fills) return null;
    const found = {
        platform: item.fills.platform,
        hours: item.fills.hours,
        achievements:
            item.fills.achievements && !!loaded(achievements, item.appid),
    };
    return found.platform || found.hours || found.achievements ? found : null;
};

/** The blanks to fill on games already logged, from what's known now. */
export const fillFrom = (
    items: SteamLibraryItem[],
    achievements: Achievements
): NonNullable<SteamImportInput["fill"]> =>
    items.flatMap((item) => {
        const fills = fillsFor(item, achievements);
        if (!fills || !item.game) return [];
        const got = fills.achievements
            ? loaded(achievements, item.appid)
            : null;
        return [
            {
                gameId: item.game.id,
                hours: fills.hours && item.hours > 0 ? item.hours : null,
                achievementsTotal: got?.total ?? null,
                achievementsCompleted: got?.unlocked ?? null,
            },
        ];
    });

/** How many logged games each blank would be filled on. */
export const fillCounts = (
    items: SteamLibraryItem[],
    achievements: Achievements
) => {
    const counts = { games: 0, platform: 0, hours: 0, achievements: 0 };
    for (const item of items) {
        const fills = fillsFor(item, achievements);
        if (!fills) continue;
        counts.games += 1;
        if (fills.platform) counts.platform += 1;
        if (fills.hours) counts.hours += 1;
        if (fills.achievements) counts.achievements += 1;
    }
    return counts;
};

const games = (n: number) => `${formatCount(n)} ${n === 1 ? "game" : "games"}`;

/** "a, b and c". */
const listed = (parts: string[]) =>
    parts.length > 1
        ? `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`
        : (parts[0] ?? "");

/** One line on what filling the blanks would add, across every game. */
export const fillSummary = (counts: ReturnType<typeof fillCounts>) =>
    `Adds ${listed(
        [
            counts.platform > 0 &&
                `Steam as the platform on ${formatCount(counts.platform)}`,
            counts.hours > 0 && `hours on ${formatCount(counts.hours)}`,
            counts.achievements > 0 &&
                `achievements on ${formatCount(counts.achievements)}`,
        ].filter((part): part is string => !!part)
    )}`;

/** Each logged game with blanks to fill, and which. */
export const fillList = (
    items: SteamLibraryItem[],
    achievements: Achievements
): { title: string; fills: string }[] =>
    items.flatMap((item) => {
        const fills = fillsFor(item, achievements);
        if (!fills || !item.game) return [];
        return [
            {
                title: item.game.title,
                fills: listed(
                    [
                        fills.platform && "platform",
                        fills.hours && "hours",
                        fills.achievements && "achievements",
                    ].filter((part): part is string => !!part)
                ),
            },
        ];
    });

/** What the button does, counting both kinds of change. */
export const addButtonLabel = (adding: number, filling: number) =>
    adding > 0 && filling > 0
        ? `Add ${formatCount(adding)}, update ${formatCount(filling)}`
        : filling > 0
          ? `Update ${games(filling)}`
          : `Add ${games(adding)}`;

/** The toast once it's in. An API from before fills sends no `updated`. */
export const importedMessage = ({ added, updated = 0 }: SteamImportResult) =>
    added > 0 && updated > 0
        ? `Added ${games(added)} and updated ${games(updated)}`
        : updated > 0
          ? `Updated ${games(updated)} on your shelves`
          : `Added ${games(added)} to your shelves`;
