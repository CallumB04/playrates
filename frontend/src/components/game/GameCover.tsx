import { igdbSized, isIgdbImage } from "@playrates/shared";
import { cn } from "../../lib/cn";

interface GameCoverProps {
    coverUrl: string | null;
    title: string;
    className?: string;
    /** How wide the cover shows, for picking a size. A list's small
     *  thumbnail says so; a tile can leave it. */
    sizes?: string;
    /** The cover the page is about, above the fold: fetched first rather
     *  than once it scrolls near. */
    priority?: boolean;
}

/* IGDB's widths for its cover sizes. */
const srcSetFor = (url: string): string | undefined =>
    isIgdbImage(url)
        ? [
              `${igdbSized(url, "cover_small")} 90w`,
              `${igdbSized(url, "cover_big")} 264w`,
              `${igdbSized(url, "cover_big_2x")} 528w`,
          ].join(", ")
        : undefined;

/**
 * The cover, or an empty well the same size. Never render `<img src="">` —
 * the browser resolves the empty string against the page and re-requests it.
 */
const GameCover = ({
    coverUrl,
    title,
    className,
    // "auto" lets a lazy image be sized from its box; the fallback is for
    // browsers that can't, and suits a tile.
    sizes = "auto, 200px",
    priority = false,
}: GameCoverProps) => {
    if (!coverUrl) {
        return (
            <div
                className={cn("bg-surface-sunken", className)}
                aria-hidden="true"
            />
        );
    }

    return (
        <span className={cn("relative block overflow-hidden", className)}>
            <img
                src={coverUrl}
                srcSet={srcSetFor(coverUrl)}
                sizes={srcSetFor(coverUrl) ? sizes : undefined}
                alt={title}
                loading={priority ? "eager" : "lazy"}
                fetchPriority={priority ? "high" : undefined}
                decoding="async"
                className="size-full object-cover"
            />
        </span>
    );
};

export default GameCover;
