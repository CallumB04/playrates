import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import ClosePopupIcon from "../ClosePopupIcon";
import { cn } from "../../lib/cn";

interface ModalProps {
    onClose: () => void;
    children: ReactNode;
    /** Extra classes for the panel, e.g. its width. */
    className?: string;
    /** Set false for the few popups that render their own close control. */
    showCloseButton?: boolean;
    labelledBy?: string;
}

/**
 * Not a native `<dialog>` with showModal() — that brings in ::backdrop, the
 * top layer and UA centring, all of which move pixels. This keeps the plain
 * markup and adds the keyboard and focus handling by hand.
 */
const PANEL =
    "relative max-h-[90vh] overflow-y-auto border border-strong bg-surface-raised p-4 shadow-modal sm:p-6";

const Modal = ({
    onClose,
    children,
    className,
    showCloseButton = true,
    labelledBy,
}: ModalProps) => {
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [onClose]);

    // stop the page behind the popup scrolling
    useEffect(() => {
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = previous;
        };
    }, []);

    // move focus into the popup, and back out when it closes
    useEffect(() => {
        const previouslyFocused = document.activeElement as HTMLElement | null;
        panelRef.current?.focus();
        return () => previouslyFocused?.focus?.();
    }, []);

    return createPortal(
        <div
            className="fixed top-0 left-0 flex h-screen w-screen items-center justify-center bg-overlay-backdrop px-4"
            onMouseDown={onClose}
        >
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={labelledBy}
                tabIndex={-1}
                className={cn(PANEL, className)}
                onMouseDown={(event) => event.stopPropagation()}
            >
                {children}
                {showCloseButton && <ClosePopupIcon onClick={onClose} />}
            </div>
        </div>,
        document.body
    );
};

export default Modal;
