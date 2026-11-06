import { createPortal } from "react-dom";
import { igdbSized, isIgdbImage } from "@playrates/shared";
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
            // Eased rather than straight: clear above the profile, then a
            // long tail that fades rather than ends. By night it stays well
            // into the name, light text holding against the dimmed art; by
            // day it eases off sooner through the name and stats. Either way
            // the grey text over it steps up a shade (on-backdrop).
            "overflow-hidden [mask-image:linear-gradient(to_bottom,black_0%,black_30%,rgb(0_0_0/0.66)_40%,rgb(0_0_0/0.44)_50%,rgb(0_0_0/0.28)_60%,rgb(0_0_0/0.15)_71%,rgb(0_0_0/0.06)_84%,transparent)] dark:[mask-image:linear-gradient(to_bottom,black_0%,black_32%,rgb(0_0_0/0.78)_44%,rgb(0_0_0/0.55)_56%,rgb(0_0_0/0.35)_68%,rgb(0_0_0/0.18)_80%,rgb(0_0_0/0.07)_90%,transparent)]",
            className
        )}
    >
        <img
            src={url}
            // A phone needs nothing like the 1080p the wide screen does.
            srcSet={
                isIgdbImage(url)
                    ? `${igdbSized(url, "720p")} 1280w, ${igdbSized(url, "1080p")} 1920w`
                    : undefined
            }
            sizes="100vw"
            alt=""
            decoding="async"
            draggable={false}
            style={{ objectPosition: `center ${position}%` }}
            className="size-full object-cover"
        />
        {/* Dims it enough for the title over it, and fades the sides so a
            wide window has no hard edge where the picture stops. Not on a
            phone: there the two sides met in the middle and, with the
            night's wash, all but hid the picture. Lighter by day: the page's
            colour there is near white, so a wash turned a picture to milk. */}
        <span className="absolute inset-0 bg-surface/5 dark:bg-surface/25" />
        <span className="absolute inset-0 hidden bg-linear-to-r from-surface/20 via-transparent to-surface/20 sm:block dark:from-surface/60 dark:to-surface/60" />
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
