import { cn } from "../../lib/cn";

interface GameCoverProps {
    coverUrl: string | null;
    title: string;
    className?: string;
}

/**
 * The cover, or a pressed well that holds the same space. Don't render
 * `<img src="">` — the browser resolves the empty string against the current
 * document and re-requests the page.
 *
 * The hatch is a fine diagonal tooth over the art, so a cover reads as printed
 * stock rather than a photograph dropped onto paper.
 */
const GameCover = ({ coverUrl, title, className }: GameCoverProps) => {
    if (!coverUrl) {
        return (
            <div
                className={cn(
                    "bg-surface-sunken",
                    className
                )}
                aria-hidden="true"
            />
        );
    }

    return (
        <span className={cn("relative block overflow-hidden", className)}>
            <img
                src={coverUrl}
                alt={title}
                loading="lazy"
                className="size-full object-cover"
            />
            <span className="hatch pointer-events-none absolute inset-0" />
        </span>
    );
};

export default GameCover;
