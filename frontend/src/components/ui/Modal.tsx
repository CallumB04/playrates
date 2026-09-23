import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import ClosePopupIcon from "../ClosePopupIcon";
import { useOverlay } from "../../hooks/useOverlay";
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
 * Not a native `<dialog>`: showModal() brings ::backdrop, the top layer and UA
 * centring with it, all of which move pixels. Keyboard and focus are handled
 * here instead.
 *
 * A bottom sheet below `sm`, the centred dialog it always was from there up.
 * `dvh` not `vh`: `vh` measures against the viewport with the browser chrome
 * retracted, so a `90vh` panel is taller than what you can see.
 */
const BACKDROP =
    "fixed inset-0 z-50 flex h-dvh w-full items-end justify-center bg-overlay-backdrop backdrop-blur-sm " +
    "sm:items-center sm:px-4";

const PANEL =
    "relative max-h-[88dvh] animate-sheet-rise overflow-y-auto " +
    "rounded-t-lg border border-b-0 border-subtle bg-surface-raised p-4 shadow-sheet " +
    // Clears the home indicator; plain p-4 anywhere without an inset.
    "pb-[calc(--spacing(4)+env(safe-area-inset-bottom))] " +
    "sm:max-h-[90dvh] sm:animate-settle sm:rounded-lg sm:border-b sm:p-6 sm:shadow-modal";

const Modal = ({
    onClose,
    children,
    className,
    showCloseButton = true,
    labelledBy,
}: ModalProps) => {
    const panelRef = useRef<HTMLDivElement>(null);

    useOverlay(onClose);

    // move focus into the popup, and back out when it closes
    useEffect(() => {
        const previouslyFocused = document.activeElement as HTMLElement | null;
        panelRef.current?.focus();
        return () => previouslyFocused?.focus?.();
    }, []);

    return createPortal(
        <div className={BACKDROP} onMouseDown={onClose}>
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
