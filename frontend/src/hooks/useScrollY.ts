import { useEffect, useState } from "react";

/**
 * The Navbar previously registered a scroll listener with an inline arrow and
 * no cleanup, so it leaked on every mount and re-rendered on every scroll
 * event.
 */
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
