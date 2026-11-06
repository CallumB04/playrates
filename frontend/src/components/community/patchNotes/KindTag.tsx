import { PATCH_NOTE_GROUP_NAMES, type PatchNoteKind } from "@playrates/shared";
import { cn } from "../../../lib/cn";
import { KIND_TONES } from "./kindTones";

/** The heading over a release's changes of one kind: a ring in its colour,
 *  where the line down its changes starts, and its name in small capitals. */
const KindTag = ({
    kind,
    className,
}: {
    kind: PatchNoteKind;
    className?: string;
}) => (
    <span
        className={cn(
            "inline-flex items-center gap-2.5 text-label-sm leading-none font-semibold tracking-[0.08em] text-content uppercase",
            className
        )}
    >
        {/* Lifted to the capitals' middle, not the line's: with nothing
            below the baseline, centring on the line left it low. */}
        <span
            aria-hidden
            className={cn(
                "size-2.5 shrink-0 -translate-y-[0.11em] rounded-full border-2",
                KIND_TONES[kind].ring
            )}
        />
        {PATCH_NOTE_GROUP_NAMES[kind]}
    </span>
);

export default KindTag;
