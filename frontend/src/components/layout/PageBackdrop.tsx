import { createPortal } from "react-dom";
import { cn } from "../../lib/cn";

/**
 * A wide picture across the top of a page, under the translucent header,
 * fading into the page at the bottom: a game's art on its page, the one a
 * profile chose on a profile. The page starts part way down it, over the
 * fade, so the picture is seen before anything else without pushing the
 * page itself below the fold — see the offsets below.
 *
 * Short on a profile, which opens on a person rather than on the art.
 *
 * Into the body, so it spans the window rather than the page column.
 */
type BackdropSize = "tall" | "short";

const HEIGHT: Record<BackdropSize, string> = {
    tall: "h-[300px] sm:h-[420px] lg:h-[500px]",
    short: "h-[200px] sm:h-[260px] lg:h-[300px]",
};

const PageBackdrop = ({
    url,
    size = "tall",
}: {
    url: string | null;
    size?: BackdropSize;
}) => {
    if (!url) return null;
    return createPortal(
        <div
            aria-hidden
            className={cn(
                "pointer-events-none absolute inset-x-0 top-0 -z-10 overflow-hidden [mask-image:linear-gradient(to_bottom,black_30%,transparent)]",
                HEIGHT[size]
            )}
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

/** Room above a page for its backdrop to be seen before the page starts. */
export const TALL_BACKDROP_OFFSET = "pt-16 sm:pt-28 lg:pt-32";
export const SHORT_BACKDROP_OFFSET = "pt-10 sm:pt-14 lg:pt-16";

export default PageBackdrop;
