import type { ReactNode } from "react";
import { Info, type LucideIcon } from "lucide-react";
import { cn } from "../../lib/cn";

/**
 * A short aside that's worth reading but isn't a warning: how something
 * works, a tip. In the info tone the toasts and notifications use, so it
 * reads as the site telling you something, not as part of the form.
 */
const Note = ({
    children,
    icon: Icon = Info,
    className,
}: {
    children: ReactNode;
    icon?: LucideIcon;
    className?: string;
}) => (
    <p
        className={cn(
            "flex items-start gap-2.5 rounded-md border border-info-border/50 bg-info-subtle/50 px-3 py-2.5 text-body-sm text-content-secondary",
            className
        )}
    >
        <Icon size={16} aria-hidden className="mt-0.5 shrink-0 text-info" />
        <span className="min-w-0">{children}</span>
    </p>
);

export default Note;
