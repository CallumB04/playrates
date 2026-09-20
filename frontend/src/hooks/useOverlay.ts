import { useEffect } from "react";

/**
 * The two things every overlay owes the page: Escape closes it, and the
 * content behind it stops scrolling.
 *
 * Shared rather than duplicated because the modal and the mobile menu look
 * nothing alike but behave identically here.
 */
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
