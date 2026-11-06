import type { PatchNoteKind } from "@playrates/shared";

interface KindTone {
    /** The ring beside its heading. */
    ring: string;
    /** The line down from the ring, beside its changes. */
    rail: string;
    /** The branch off that line to each change, in the line's colour. */
    branch: string;
}

/** Each kind of change in a colour of its own, so a release reads by its
 *  sections at a glance; the heading's words say it too. */
export const KIND_TONES: Record<PatchNoteKind, KindTone> = {
    feature: {
        ring: "border-brand",
        rail: "border-brand/30",
        branch: "before:bg-brand/30",
    },
    improvement: {
        ring: "border-info",
        rail: "border-info/30",
        branch: "before:bg-info/30",
    },
    fix: {
        ring: "border-success",
        rail: "border-success/30",
        branch: "before:bg-success/30",
    },
    removed: {
        ring: "border-warning",
        rail: "border-warning/30",
        branch: "before:bg-warning/30",
    },
    other: {
        ring: "border-content-muted",
        rail: "border-strong",
        branch: "before:bg-strong",
    },
};
