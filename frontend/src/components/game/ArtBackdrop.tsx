import { useCallback, useEffect, useRef, useState } from "react";
import { igdbSized } from "@playrates/shared";
import { cn } from "../../lib/cn";

/* How much of the art shows, place by place, as a mask on the art itself:
   it fades into the card's own surface. Whole class strings, so the
   stylesheet keeps them. */
const FADES = {
    // Faint behind the words on a wide card, stronger to the right; on a
    // phone, fading down the card.
    side: "[mask-image:linear-gradient(to_bottom,rgb(0_0_0/0.3),rgb(0_0_0/0.12)_55%,rgb(0_0_0/0.05))] sm:[mask-image:linear-gradient(to_right,transparent_30%,rgb(0_0_0/0.18)_60%,rgb(0_0_0/0.55))]",
    // Down the card at every width, for one too narrow to give the art a
    // side of its own. Gone at the foot, where the figures sit.
    down: "[mask-image:linear-gradient(to_bottom,rgb(0_0_0/0.3),rgb(0_0_0/0.1)_50%,transparent)]",
    // A row's right-hand end at every width: a row is too short to fade
    // down, and its words start at the left.
    row: "[mask-image:linear-gradient(to_right,transparent_40%,rgb(0_0_0/0.14)_72%,rgb(0_0_0/0.3))]",
};

/** How long a picture takes to fade in, and so to count as shown. */
const FADE_MS = 500;

/** One picture, hidden until it has loaded and then faded in, so a slow
 *  one never shows half drawn or pops in late. */
const Layer = ({ url, onShown }: { url: string; onShown?: () => void }) => {
    const [loaded, setLoaded] = useState(false);
    const img = useRef<HTMLImageElement>(null);
    // One already in the cache can finish before React is listening.
    useEffect(() => {
        if (img.current?.complete) setLoaded(true);
    }, []);
    // Timed rather than on transitionend, which never fires with reduced
    // motion.
    useEffect(() => {
        if (!loaded || !onShown) return;
        const done = setTimeout(onShown, FADE_MS);
        return () => clearTimeout(done);
    }, [loaded, onShown]);
    return (
        <img
            ref={img}
            src={igdbSized(url, "screenshot_big")}
            alt=""
            decoding="async"
            onLoad={() => setLoaded(true)}
            className={cn(
                "absolute inset-0 size-full object-cover transition-opacity duration-500 ease-out motion-reduce:transition-none",
                loaded ? "opacity-100" : "opacity-0"
            )}
        />
    );
};

/**
 * A game's own art behind a card, as Now playing has it, fading into the
 * card where the words are. A mask on the art rather than a veil over it:
 * two layers clipped to the same rounded corner each smooth its edge on
 * their own, and the art showed round the curve as a light patch.
 *
 * A new picture fades in over the last one fully shown, which stays
 * until it's covered: swapped outright, the card's own surface showed
 * between the two.
 *
 * It sits under everything else in the card, so the card needs only
 * `relative isolate overflow-hidden`, and its contents nothing at all.
 */
const ArtBackdrop = ({
    url,
    fade = "side",
}: {
    url: string | null | undefined;
    fade?: keyof typeof FADES;
}) => {
    const [settled, setSettled] = useState<string | null>(null);
    const settle = useCallback(() => setSettled(url ?? null), [url]);

    return url ? (
        <span
            aria-hidden
            className={cn(
                "pointer-events-none absolute inset-0 -z-10",
                FADES[fade]
            )}
        >
            {/* Keyed by picture, so the one underneath keeps its state
                as it moves down and never fades in again. */}
            {settled && settled !== url && (
                <Layer key={settled} url={settled} />
            )}
            <Layer key={url} url={url} onShown={settle} />
        </span>
    ) : null;
};

export default ArtBackdrop;
