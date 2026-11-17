import type { AdminAttention, AdminHealth } from "@playrates/shared";
import {
    headline,
    systemStates,
    type SystemState,
} from "../health/healthState";

/** The admin sections that can be waiting on the admin. */
export type AttentionSection = "reports" | "health" | "announcements";

/** How many things wait in each section; nothing while it loads. */
export const attentionBySection = (
    attention: AdminAttention | undefined
): Record<AttentionSection, number> => ({
    reports: attention?.reports ?? 0,
    health: (attention?.serverErrors ?? 0) + (attention?.clientErrors ?? 0),
    announcements: attention?.patchNotes ?? 0,
});

/** What a section's count stands for, for whoever can't see the badge. */
export const attentionWords = (section: AttentionSection, n: number) => {
    switch (section) {
        case "reports":
            return n === 1 ? "1 open report" : `${n} open reports`;
        case "health":
            return n === 1
                ? "1 error in the last day"
                : `${n} errors in the last day`;
        case "announcements":
            return n === 1
                ? "1 patch notes entry to send"
                : `${n} patch notes entries to send`;
    }
};

/** Everything waiting outside the section on screen, for the phone's
 *  switcher, where the rest of the nav is out of sight. */
export const waitingElsewhere = (
    counts: Record<AttentionSection, number>,
    here: string | undefined
) =>
    (Object.keys(counts) as AttentionSection[])
        .filter((section) => section !== here)
        .reduce((n, section) => n + counts[section], 0);

/** One thing on the overview that wants the admin. */
export interface NeedsYouItem {
    key: AttentionSection | "systems";
    /** How many, set beside the words; none for a system's state. */
    count?: number;
    text: string;
    detail?: string;
    /** Where it's dealt with. A system's state opens the health popup. */
    to?: string;
    /** For a system, how bad. */
    state?: Exclude<SystemState, "up">;
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/**
 * What wants the admin, worst first: a system in trouble, errors, reports,
 * then patch notes to send. Empty when nothing does. Errors are left out
 * of the systems' state since they have a row of their own.
 */
export const needsYou = (
    attention: AdminAttention | undefined,
    health: AdminHealth | undefined
): NeedsYouItem[] => {
    const items: NeedsYouItem[] = [];
    if (health) {
        const states = { ...systemStates(health), errors: "up" as const };
        const lead = headline(states);
        if (lead.state !== "up") {
            items.push({ key: "systems", text: lead.text, state: lead.state });
        }
    }
    if (!attention) return items;

    const { serverErrors: api, clientErrors: browsers } = attention;
    const errors = api + browsers;
    if (errors > 0) {
        items.push({
            key: "health",
            count: errors,
            text: `${plural(errors, "error", "errors")} in the last day`,
            detail:
                api > 0 && browsers > 0
                    ? `${api} from the API, ${browsers} in browsers`
                    : api > 0
                      ? "From the API"
                      : "In browsers",
            to: "/admin/health",
        });
    }
    if (attention.reports > 0) {
        items.push({
            key: "reports",
            count: attention.reports,
            text: plural(
                attention.reports,
                "report to look at",
                "reports to look at"
            ),
            to: "/admin/reports",
        });
    }
    if (attention.patchNotes > 0) {
        items.push({
            key: "announcements",
            count: attention.patchNotes,
            text: plural(
                attention.patchNotes,
                "patch notes entry to send",
                "patch notes entries to send"
            ),
            to: "/admin/announcements?view=patch-notes",
        });
    }
    return items;
};
