import { useEffect, useRef } from "react";

/* The overlays open now, oldest first. A purchase can open over a picker:
   Escape is for the one on top, and the page scrolls again only once the
   last has closed, whichever order they go in. */
const open: symbol[] = [];
let overflowBefore = "";

/** Escape closes, and the page behind stops scrolling. Shared by the modal
 *  and the mobile menu, which behave identically here. */
export const useOverlay = (onClose: () => void) => {
    // The latest, without taking a new place in the stack every render.
    const close = useRef(onClose);
    close.current = onClose;

    useEffect(() => {
        const me = Symbol();
        if (open.length === 0) {
            overflowBefore = document.body.style.overflow;
            document.body.style.overflow = "hidden";
        }
        open.push(me);
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" && open.at(-1) === me) close.current();
        };
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("keydown", onKeyDown);
            open.splice(open.indexOf(me), 1);
            if (open.length === 0)
                document.body.style.overflow = overflowBefore;
        };
    }, []);
};
