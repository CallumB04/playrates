import { useEffect, useState } from "react";

interface WindowSize {
    width: number;
    height: number;
}

/** rAF-throttled, so a drag-resize does not trigger a render per pixel. */
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
