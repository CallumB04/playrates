import { cn } from "../../lib/cn";

interface GameCoverProps {
    coverUrl: string | null;
    title: string;
    className?: string;
}

/**
 * The cover, or an empty well the same size. Never render `<img src="">` —
 * the browser resolves the empty string against the page and re-requests it.
 */
const GameCover = ({ coverUrl, title, className }: GameCoverProps) => {
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
                alt={title}
                loading="lazy"
                className="size-full object-cover"
            />
            <span className="pointer-events-none absolute inset-0 hatch" />
        </span>
    );
};

export default GameCover;
