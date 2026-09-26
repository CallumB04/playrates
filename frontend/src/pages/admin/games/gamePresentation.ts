import {
    CircleAlert,
    FileText,
    Flame,
    FlameKindling,
    Image,
    ImagePlus,
    PackagePlus,
    RefreshCw,
    Search,
    Type,
    CalendarClock,
    DownloadCloud,
    type LucideIcon,
} from "lucide-react";
import type { AdminGameEvent, GameEventGroup } from "@playrates/shared";

export const GAME_GROUP_TONES: Record<
    GameEventGroup,
    { label: string; bar: string; icon: string }
> = {
    added: { label: "New games", bar: "bg-success", icon: "text-success" },
    content: { label: "Art & text", bar: "bg-info", icon: "text-info" },
    pulls: { label: "RAWG calls", bar: "bg-brand", icon: "text-brand" },
    failures: { label: "Failures", bar: "bg-danger", icon: "text-danger" },
    controls: { label: "Your changes", bar: "bg-accent", icon: "text-accent" },
};

const ICONS: Record<string, LucideIcon> = {
    game_added: PackagePlus,
    rawg_import: DownloadCloud,
    cover_updated: Image,
    box_art_updated: ImagePlus,
    description_pulled: FileText,
    release_date_changed: CalendarClock,
    title_changed: Type,
    details_resynced: RefreshCw,
    search_pull: Search,
    manual_pull: DownloadCloud,
    details_backfill_failed: CircleAlert,
    trending_set: Flame,
    trending_cleared: FlameKindling,
};

export const gameEventIcon = (kind: string): LucideIcon =>
    ICONS[kind] ?? FileText;

export const gameEventTone = (event: AdminGameEvent) => {
    // A pull or a re-sync that failed reads as a failure, whatever its kind.
    if (event.data.failed === true || event.data.ok === false) {
        return GAME_GROUP_TONES.failures;
    }
    return event.group ? GAME_GROUP_TONES[event.group] : GAME_GROUP_TONES.content;
};

const num = (value: unknown): number =>
    typeof value === "number" ? value : 0;
const str = (value: unknown): string | null =>
    typeof value === "string" && value !== "" ? value : null;

const plural = (n: number, one: string, many = `${one}s`) =>
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
            return { title, text: "imported from RAWG by id" };
        case "cover_updated":
            return { title, text: d.hadOne ? "got a new cover" : "got its cover" };
        case "box_art_updated":
            return { title, text: d.hadOne ? "got new box art" : "got box art" };
        case "description_pulled":
            return {
                title,
                text: d.hadOne ? "had its description replaced" : "got its description",
            };
        case "release_date_changed":
            return {
                title,
                text: `release date moved ${str(d.from) ?? "from none"} → ${str(d.to) ?? "none"}`,
            };
        case "title_changed":
            return { title, text: `was renamed from ${str(d.from) ?? "?"}` };
        case "details_resynced":
            return {
                title,
                text: d.ok === false ? "re-sync failed" : "details re-synced",
            };
        case "details_backfill_failed":
            return {
                title,
                text: `details couldn't be fetched${str(d.error) ? `: ${d.error}` : ""}`,
            };
        case "trending_set":
            return { title, text: "flagged as trending" };
        case "trending_cleared":
            return { title, text: "no longer trending" };
        case "search_pull":
            if (d.failed === true) {
                return {
                    title: null,
                    text: `A search for “${str(d.term) ?? "?"}” couldn't reach RAWG`,
                };
            }
            return {
                title: null,
                text: `A search for “${str(d.term) ?? "?"}” went to RAWG: ${plural(num(d.fetched), "result")}, ${num(d.added).toLocaleString("en-GB")} new`,
            };
        case "manual_pull":
            if (d.failed === true) {
                return { title: null, text: `A manual pull failed after ${plural(num(d.pages), "page")}` };
            }
            return {
                title: null,
                text: `A manual pull fetched ${plural(num(d.fetched), "game")} over ${plural(num(d.pages), "page")}: ${num(d.added).toLocaleString("en-GB")} new`,
            };
        default:
            return { title, text: event.kind.replace(/_/g, " ") };
    }
};

export type QuotaLevel = "ok" | "warning" | "danger";

/** Warn at three quarters of the month's allowance, and loudly at nine
 *  tenths: past it, search stops finding new games and imports fail. */
export const quotaLevel = (used: number, allowance: number): QuotaLevel => {
    const share = allowance === 0 ? 1 : used / allowance;
    if (share >= 0.9) return "danger";
    if (share >= 0.75) return "warning";
    return "ok";
};
