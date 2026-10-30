import { createPortal } from "react-dom";
import { cn } from "../../lib/cn";

/**
 * A wide picture across the top of a page, under the translucent header,
 * fading into the page at the bottom: a game's art on its page, the one a
 * profile chose on a profile. The page starts part way down it, over the
 * fade, so the picture is seen before anything else without pushing the
 * page itself below the fold — see the offsets below.
 *
 * A profile's runs further down, faint behind the person and their
 * numbers: it's their room, so it should carry on behind them rather than
 * stop at their picture.
 *
 * Into the body, so it spans the window rather than the page column.
 */
type BackdropSize = "tall" | "short";

const HEIGHT: Record<BackdropSize, string> = {
    tall: "h-[300px] sm:h-[420px] lg:h-[500px]",
    short: "h-[420px] sm:h-[500px] lg:h-[580px]",
};

/**
 * The picture as a backdrop draws it: faded out at the bottom, dimmed, and
 * shaded at the sides.
 */
const BackdropArt = ({
    url,
    position,
    className,
}: {
    url: string;
    position: number;
    className?: string;
}) => (
    <div
        aria-hidden
        className={cn(
            // Eased rather than straight: clear above the profile, faint by
            // the name, then a long tail that fades rather than ends.
            "overflow-hidden [mask-image:linear-gradient(to_bottom,black_0%,black_24%,rgb(0_0_0/0.62)_38%,rgb(0_0_0/0.32)_50%,rgb(0_0_0/0.17)_63%,rgb(0_0_0/0.08)_78%,rgb(0_0_0/0.03)_90%,transparent)]",
            className
        )}
    >
        <img
            src={url}
            alt=""
            draggable={false}
            style={{ objectPosition: `center ${position}%` }}
            className="size-full object-cover"
        />
        {/* Dims it enough for the title over it, and fades the sides so a
            wide window has no hard edge where the picture stops. Not on a
            phone: there the two sides met in the middle and, with the
            night's wash, all but hid the picture. Lighter by day: the page's
            colour there is near white, so a wash turned a picture to milk. */}
        <span className="absolute inset-0 bg-surface/15 dark:bg-surface/25" />
        <span className="absolute inset-0 hidden bg-linear-to-r from-surface/40 via-transparent to-surface/40 sm:block dark:from-surface/60 dark:to-surface/60" />
    </div>
);

const PageBackdrop = ({
    url,
    size = "tall",
    position = 30,
}: {
    url: string | null;
    size?: BackdropSize;
    /** Which part of the picture shows, 0 the top to 100 the bottom. */
    position?: number;
}) => {
    if (!url) return null;
    return createPortal(
        <BackdropArt
            url={url}
            position={position}
            className={cn(
                "pointer-events-none absolute inset-x-0 top-0 -z-10",
                HEIGHT[size]
            )}
        />,
        document.body
    );
};

/** Room above a page for its backdrop to be seen before the page starts. */
export const TALL_BACKDROP_OFFSET = "pt-16 sm:pt-28 lg:pt-32";
export const SHORT_BACKDROP_OFFSET = "pt-12 sm:pt-20 lg:pt-24";

export default PageBackdrop;
