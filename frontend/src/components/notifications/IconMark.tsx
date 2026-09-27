import type { LucideIcon } from "lucide-react";
import { cn } from "../../lib/cn";

/** The mark a notification shows when it has no face to show. */
const IconMark = ({ icon: Icon, tone }: { icon: LucideIcon; tone: string }) => (
    <span
        className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full border border-subtle bg-surface-sunken",
            tone
        )}
    >
        <Icon size={16} aria-hidden />
    </span>
);

export default IconMark;
