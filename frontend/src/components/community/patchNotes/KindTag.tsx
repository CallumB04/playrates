import { PATCH_NOTE_KIND_NAMES, type PatchNoteKind } from "@playrates/shared";
import { cn } from "../../../lib/cn";

/** Each kind's colour: the text, and a border in the same hue. */
const TONE: Record<PatchNoteKind, string> = {
    feature: "border-brand/45 text-brand-text",
    improvement: "border-info/45 text-info-content",
    fix: "border-success/45 text-success-content",
    other: "border-strong text-content-muted",
};

/** A change's kind, stamped as the site's other labels are ("Official").
 *  One width for all, so a release's changes start in a column. */
const KindTag = ({
    kind,
    className,
}: {
    kind: PatchNoteKind;
    className?: string;
}) => (
    <span
        className={cn(
            "inline-flex w-[5.75rem] justify-center rounded-xs border px-1.5 py-px text-stamp font-semibold tracking-wider uppercase",
            TONE[kind],
            className
        )}
    >
        {PATCH_NOTE_KIND_NAMES[kind]}
    </span>
);

export default KindTag;
