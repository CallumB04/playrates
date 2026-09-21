import type { Platform } from "@playrates/shared";
import { platformIcon } from "../../lib/platformIcons";
import { cn } from "../../lib/cn";

interface PlatformMarksProps {
    slugs: string[];
    platforms: Platform[];
    /** Beyond this, the rest become a "+n". */
    max?: number;
    className?: string;
}

/**
 * The platforms a game is on, as marks.
 *
 * "Steam +3" needed a word and a figure to say what four small icons say at
 * a glance, and on a narrow tile that word wrapped onto its own line and
 * pushed the release year out of the row. Marks are fixed width, so the line
 * under a cover is the same height whether a game is on one platform or six.
 */
const PlatformMarks = ({
    slugs,
    platforms,
    max = 4,
    className,
}: PlatformMarksProps) => {
    if (slugs.length === 0) return null;

    // Follow the catalogue's own order rather than whatever order the game
    // happens to list them in, so the same platform sits in the same place
    // across a grid.
    const ordered = platforms
        .filter((p) => slugs.includes(p.slug))
        .map((p) => ({ slug: p.slug, name: p.displayName }));

    // A slug with no matching platform row still counts, rather than vanishing.
    const unknown = slugs
        .filter((slug) => !ordered.some((p) => p.slug === slug))
        .map((slug) => ({ slug, name: slug }));

    const all = [...ordered, ...unknown];
    const shown = all.slice(0, max);
    const rest = all.length - shown.length;

    return (
        <span
            className={cn("flex items-center gap-1.5", className)}
            title={all.map((p) => p.name).join(", ")}
        >
            {shown.map((platform) => {
                const Icon = platformIcon(platform.slug);
                return (
                    <Icon
                        key={platform.slug}
                        size={13}
                        aria-hidden
                        className="shrink-0"
                    />
                );
            })}
            {rest > 0 && (
                <span className="font-mono text-[10px] leading-none">
                    +{rest}
                </span>
            )}
            <span className="sr-only">
                Available on {all.map((p) => p.name).join(", ")}
            </span>
        </span>
    );
};

export default PlatformMarks;
