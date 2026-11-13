import { useEffect, useRef, useState } from "react";
import { igdbSized } from "@playrates/shared";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { cn } from "../../lib/cn";

/** How long each game's art holds before the next takes over. */
const ART_HOLDS_MS = 7000;

const artProps = (url: string) => ({
    src: igdbSized(url, "1080p"),
    srcSet: `${igdbSized(url, "screenshot_big")} 889w, ${igdbSized(url, "720p")} 1280w, ${igdbSized(url, "1080p")} 1920w`,
    sizes: "(min-width: 1024px) 55vw, 100vw",
});

/**
 * The trending games' art, one after another: each fades in over the last,
 * drifting slowly as it does. The next is loaded before it's shown, so a
 * change is never a blank; the cycle rests while the tab is hidden, and
 * with reduced motion one picture simply stays.
 */
const ArtCycle = ({
    arts,
    className = "opacity-70",
}: {
    arts: string[];
    /** How the art sits on the dark under it: its strength, and a mask
     *  where the words need the dark to themselves. */
    className?: string;
}) => {
    const still = usePrefersReducedMotion();
    const [shown, setShown] = useState<{ on: number; under: number | null }>({
        on: 0,
        under: null,
    });
    const on = useRef(0);

    useEffect(() => {
        if (still || arts.length < 2) return;
        let live = true;
        const id = window.setInterval(() => {
            if (document.hidden) return;
            const next = (on.current + 1) % arts.length;
            const img = new Image();
            Object.assign(img, artProps(arts[next]!));
            void img
                .decode()
                .catch(() => undefined)
                .then(() => {
                    if (!live) return;
                    setShown({ on: next, under: on.current });
                    on.current = next;
                });
        }, ART_HOLDS_MS);
        return () => {
            live = false;
            window.clearInterval(id);
        };
    }, [arts, still]);

    if (arts.length === 0) return null;
    return (
        <span aria-hidden className={cn("absolute inset-0 -z-20", className)}>
            {[shown.under, shown.on].map(
                (i) =>
                    i !== null &&
                    arts[i] && (
                        <img
                            key={arts[i]}
                            {...artProps(arts[i])}
                            alt=""
                            decoding="async"
                            className="absolute inset-0 size-full animate-art-in object-cover"
                        />
                    )
            )}
        </span>
    );
};

export default ArtCycle;
