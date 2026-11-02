import { PATCH_NOTE_KIND_NAMES, type PatchNoteKind } from "@playrates/shared";
import { cn } from "../../../lib/cn";

const DOT: Record<PatchNoteKind, string> = {
    feature: "bg-brand",
    improvement: "bg-info",
    fix: "bg-success",
    other: "bg-content-muted",
};

/** A change's kind: its colour in a dot, its name in quiet text, so the
 *  change itself is what reads first. */
const KindTag = ({
    kind,
    className,
}: {
    kind: PatchNoteKind;
    className?: string;
}) => (
    <span
        className={cn(
            "inline-flex items-center gap-1.5 text-label-sm font-medium text-content-muted",
            className
        )}
    >
        <span aria-hidden className={cn("size-2 rounded-full", DOT[kind])} />
        {PATCH_NOTE_KIND_NAMES[kind]}
    </span>
);

export default KindTag;
