import type { LucideIcon } from "lucide-react";
import { MessageSquare, Users } from "lucide-react";
import { formatCount, formatMessageCount } from "../../lib/format";
import { cn } from "../../lib/cn";

/* An icon for each, so the figures read as a pair when they stack. */
const Stat = ({
    icon: Icon,
    figure,
    label,
    className,
}: {
    icon: LucideIcon;
    figure: string;
    label: string;
    className?: string;
}) => (
    <span className={cn("inline-flex items-center gap-1", className)}>
        <Icon size={13} aria-hidden className="shrink-0" />
        <span className="font-mono text-content tabular-nums">{figure}</span>
        {label}
    </span>
);

/** Messages in a thread within the trending window. */
export const NewMessageCount = ({
    count,
    className,
}: {
    count: number;
    className?: string;
}) => (
    <Stat
        icon={MessageSquare}
        figure={formatMessageCount(count)}
        label={count === 1 ? "new message" : "new messages"}
        className={className}
    />
);

/** How many people have posted in a thread. */
export const PeopleCount = ({
    count,
    className,
}: {
    count: number;
    className?: string;
}) => (
    <Stat
        icon={Users}
        figure={formatCount(count)}
        label={count === 1 ? "person" : "people"}
        className={className}
    />
);
