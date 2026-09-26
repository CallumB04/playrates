import { CircleAlert, Flame, type LucideIcon } from "lucide-react";
import type { AdminGameEvent, GameEventGroup, RawgUsage } from "@playrates/shared";

export const GAME_GROUP_LABELS: Record<GameEventGroup, string> = {
    added: "Arrivals",
    content: "Art and text",
    pulls: "Calls to RAWG",
    failures: "Failures",
    controls: "Your changes",
};

export const SOURCE_WORDS: Record<string, string> = {
    search: "from a search",
    page_view: "when someone opened it",
    manual_pull: "from a manual pull",
    import: "from an import",
    admin: "by you",
};

/** The one mark a line carries: it failed, or it was put on the trending
 *  rail, the one change of yours people will notice. */
export const gameEventMark = (
    event: AdminGameEvent
): { icon: LucideIcon; label: string; className: string } | null => {
    if (event.data.failed === true || event.data.ok === false || event.kind === "details_backfill_failed") {
        return { icon: CircleAlert, label: "Failed", className: "text-danger" };
    }
    if (event.kind === "trending_set") {
        return { icon: Flame, label: "Trending", className: "text-accent" };
    }
    return null;
};

const num = (value: unknown): number => (typeof value === "number" ? value : 0);
const str = (value: unknown): string | null =>
    typeof value === "string" && value !== "" ? value : null;

const count = (n: number, one: string, many = `${one}s`) =>
    `${n.toLocaleString("en-GB")} ${n === 1 ? one : many}`;

/** One line per catalogue event. The title comes from the game where it still
 *  exists, and from what the event kept where it doesn't. */
export const gameEventSummary = (
    event: AdminGameEvent
): { title: string | null; text: string } => {
    const d = event.data;
    const title = event.game?.title ?? str(d.title);

    switch (event.kind) {
        case "game_added":
            return { title, text: "arrived in the catalogue" };
        case "rawg_import":
            return { title, text: "was imported from RAWG by its id" };
        case "cover_updated":
            return { title, text: d.hadOne ? "got a new cover" : "got its cover" };
        case "box_art_updated":
            return { title, text: d.hadOne ? "got new box art" : "got its box art" };
        case "description_pulled":
            return { title, text: d.hadOne ? "had its description replaced" : "got its description" };
        case "release_date_changed":
            return {
                title,
                text: `moved its release from ${str(d.from) ?? "no date"} to ${str(d.to) ?? "no date"}`,
            };
        case "title_changed":
            return { title, text: `was renamed from ${str(d.from) ?? "something else"}` };
        case "details_resynced":
            return { title, text: d.ok === false ? "couldn’t be re-synced" : "was re-synced" };
        case "details_backfill_failed":
            return {
                title,
                text: `couldn’t fetch its details${str(d.error) ? `: ${d.error}` : ""}`,
            };
        case "trending_set":
            return { title, text: "went on the trending rail" };
        case "trending_cleared":
            return { title, text: "came off the trending rail" };
        case "search_pull":
            return d.failed === true
                ? { title: null, text: `A search for “${str(d.term) ?? "?"}” couldn’t reach RAWG` }
                : {
                      title: null,
                      text: `A search for “${str(d.term) ?? "?"}” asked RAWG and brought back ${count(num(d.fetched), "game")}, ${num(d.added).toLocaleString("en-GB")} new`,
                  };
        case "manual_pull":
            return d.failed === true
                ? { title: null, text: `A pull stopped after ${count(num(d.pages), "page")}` }
                : {
                      title: null,
                      text: `A pull fetched ${count(num(d.fetched), "game")} over ${count(num(d.pages), "page")}, ${num(d.added).toLocaleString("en-GB")} new`,
                  };
        default:
            return { title, text: event.kind.replace(/_/g, " ") };
    }
};

export type QuotaLevel = "ok" | "warning" | "danger";

/** Running out before the reset is the thing worth colour; under a quarter
 *  left is worth a warning. */
export const allowanceTone = (usage: RawgUsage): QuotaLevel =>
    usage.runsOutOn ? "danger" : usage.left < usage.allowance * 0.25 ? "warning" : "ok";
