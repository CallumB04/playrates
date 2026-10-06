import { createPortal } from "react-dom";

/**
 * The game's wide art behind the top of its page, so a game with little else
 * to show still opens on its own colours.
 *
 * Into the body and from the very top, so it carries on up behind the
 * translucent header rather than stopping at its edge. An ellipse fading out
 * from the top centre leaves no straight edge anywhere, and the blur keeps
 * it a wash of colour rather than a second picture competing with the cover.
 */
const GameBackdrop = ({ url }: { url: string | null }) => {
    if (!url) return null;
    return createPortal(
        <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] overflow-hidden [mask-image:radial-gradient(ellipse_75%_100%_at_50%_0%,black_25%,transparent_100%)] sm:h-[520px]"
        >
            <img
                src={url}
                alt=""
                className="size-full scale-110 object-cover opacity-20 blur-xl dark:opacity-30"
            />
        </div>,
        document.body
    );
};

export default GameBackdrop;
