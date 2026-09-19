import { useEffect, useState } from "react";

interface WindowSize {
    width: number;
    height: number;
}

/**
 * One rAF-throttled resize listener, replacing the identical effect that lived
 * in both ProfilePage and LibraryPage and called setState on every pixel of
 * every resize.
 */
export const useWindowSize = (): WindowSize => {
    const [size, setSize] = useState<WindowSize>(() => ({
        width: window.innerWidth,
        height: window.innerHeight,
    }));

    useEffect(() => {
        let frame = 0;

        const handleResize = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
                setSize({
                    width: window.innerWidth,
                    height: window.innerHeight,
                });
            });
        };

        window.addEventListener("resize", handleResize);
        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener("resize", handleResize);
        };
    }, []);

    return size;
};
