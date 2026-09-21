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
 * The platforms a game is on, as marks. Fixed width, so the line under a cover
 * is the same height for one platform or six.
 */
const PlatformMarks = ({
    slugs,
    platforms,
    max = 4,
    className,
}: PlatformMarksProps) => {
    if (slugs.length === 0) return null;

    // Catalogue order, so the same platform sits in the same place in a grid.
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
