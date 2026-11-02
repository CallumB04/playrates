import BadgeMedal from "./BadgeMedal";
import { cn } from "../../lib/cn";
import type { ShownBadge } from "./showcase";

/** The badges a member pinned, in a row. */
const ShowcaseView = ({
    badges,
    size = "sm",
    className,
}: {
    badges: ShownBadge[];
    size?: "sm" | "md";
    className?: string;
}) => (
    <ul className={cn("flex flex-wrap items-center gap-1.5", className)}>
        {badges.map(({ def, metal }) => (
            <li key={def.key} title={def.name}>
                <BadgeMedal badge={def} metal={metal} size={size} />
            </li>
        ))}
    </ul>
);

export default ShowcaseView;
