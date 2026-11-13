import { cn } from "../../lib/cn";

/**
 * A play triangle centred by its weight, not its box: the icon set's sits
 * with its point at the edge, so its mass reads left of centre in a
 * square. This one's centroid is the middle of the box, and its corners
 * are softened to match the icons beside it.
 */
const PlayGlyph = ({
    size = 16,
    className,
}: {
    size?: number;
    className?: string;
}) => (
    <svg
        aria-hidden
        viewBox="0 0 24 24"
        width={size}
        height={size}
        className={cn("shrink-0", className)}
    >
        <polygon
            points="8,5 8,19 20,12"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinejoin="round"
        />
    </svg>
);

export default PlayGlyph;
