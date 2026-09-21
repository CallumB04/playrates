import { useEffect } from "react";

/** Escape closes, and the page behind stops scrolling. Shared by the modal
 *  and the mobile menu, which behave identically here. */
export const useOverlay = (onClose: () => void) => {
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [onClose]);

    useEffect(() => {
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = previous;
        };
    }, []);
};
