import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/** How long to wait for the element: the page draws its parts as their
 *  data lands, and the router leaves the hash to the page. */
const WAIT_MS = 3000;

/** Scrolls to whatever the URL's hash names, once it's on the page. */
export const useScrollToHash = () => {
    const { hash } = useLocation();
    useEffect(() => {
        if (!hash) return;
        const id = decodeURIComponent(hash.slice(1));
        const until = performance.now() + WAIT_MS;
        let frame = 0;
        const find = () => {
            const target = document.getElementById(id);
            if (target) target.scrollIntoView({ block: "start" });
            else if (performance.now() < until)
                frame = requestAnimationFrame(find);
        };
        find();
        return () => cancelAnimationFrame(frame);
    }, [hash]);
};
