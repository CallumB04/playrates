import { createPortal } from "react-dom";

/**
 * The game's wide art as a banner across the top of its page, under the
 * translucent header, fading into the page at the bottom. The page starts
 * part way down it, over the fade, so the picture is seen before anything
 * else without pushing the game itself below the fold.
 *
 * Into the body, so it spans the window rather than the page column.
 */
const GameBackdrop = ({ url }: { url: string | null }) => {
    if (!url) return null;
    return createPortal(
        <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[300px] overflow-hidden [mask-image:linear-gradient(to_bottom,black_30%,transparent)] sm:h-[420px] lg:h-[500px]"
        >
            <img
                src={url}
                alt=""
                className="size-full object-cover object-[center_30%]"
            />
            {/* Dims it enough for the title over its lower half, in either
                theme, and darkens the sides so a wide window has no hard
                edge where the picture stops. */}
            <span className="absolute inset-0 bg-surface/45" />
            <span className="absolute inset-0 bg-linear-to-r from-surface/70 via-transparent to-surface/70" />
        </div>,
        document.body
    );
};

export default GameBackdrop;
