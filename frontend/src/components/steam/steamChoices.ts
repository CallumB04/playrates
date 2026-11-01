import type { SteamImportInput, SteamLibraryItem } from "@playrates/shared";

export type SteamChoice = "played" | "backlog" | "skip";

/** What each game starts as: its suggestion, if it's one we can add. */
export const startingChoices = (
    items: SteamLibraryItem[]
): Map<number, SteamChoice> =>
    new Map(
        items
            .filter((item) => item.game && !item.logged)
            .map((item) => [item.game!.id, item.suggested])
    );

/** The import, from the choices: skipped games left out, and hours only
 *  where they were played. */
export const importFrom = (
    items: SteamLibraryItem[],
    choices: Map<number, SteamChoice>
): SteamImportInput["games"] =>
    items.flatMap((item) => {
        const id = item.game?.id;
        const choice = id === undefined ? undefined : choices.get(id);
        if (id === undefined || !choice || choice === "skip") return [];
        return [
            {
                gameId: id,
                status: choice,
                hours:
                    choice === "played" && item.hours > 0 ? item.hours : null,
            },
        ];
    });
