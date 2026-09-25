import { Users } from "lucide-react";
import { formatCount } from "../../lib/format";
import { cn } from "../../lib/cn";

/** How many people have posted in a thread. */
const PeopleCount = ({
    count,
    className,
}: {
    count: number;
    className?: string;
}) => (
    <span className={cn("inline-flex items-center gap-1", className)}>
        <Users size={13} aria-hidden />
        <span className="font-mono text-content tabular-nums">
            {formatCount(count)}
        </span>
        {count === 1 ? "person" : "people"}
    </span>
);

export default PeopleCount;
