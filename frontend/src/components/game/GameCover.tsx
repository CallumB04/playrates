interface GameCoverProps {
    coverUrl: string | null;
    title: string;
    className?: string;
}

/**
 * Renders a game's cover, or nothing when there isn't one.
 *
 * Rendering `<img src="">` is not harmless: the browser resolves the empty
 * string against the current document and re-requests the page itself. The
 * placeholder block keeps the tile's layout the same either way.
 */
const GameCover = ({ coverUrl, title, className }: GameCoverProps) => {
    if (!coverUrl) {
        return (
            <div
                className={`${className ?? ""} bg-surface-media`}
                aria-hidden="true"
            ></div>
        );
    }

    return <img src={coverUrl} alt={title} className={className} />;
};

export default GameCover;
