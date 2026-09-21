import { useEffect, useState } from "react";

/** rAF-throttled, so a scroll does not trigger a render per event. */
export const useScrollY = (): number => {
    const [scrollY, setScrollY] = useState(() => window.scrollY);

    useEffect(() => {
        let frame = 0;

        const handleScroll = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => setScrollY(window.scrollY));
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener("scroll", handleScroll);
        };
    }, []);

    return scrollY;
};
