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
 * The shared popup shell. The same backdrop + stopPropagation + close-icon
 * pattern was repeated across eleven `<dialog>` elements in nine files.
 *
 * Deliberately NOT a native `<dialog>` with showModal(). The old markup used
 * `<dialog>` as a styled div and never opened it — it only rendered because
 * `.popup-backdrop` sets display:flex over the UA display:none. Calling
 * showModal() would bring in ::backdrop, the top layer and UA centring, all
 * of which would move pixels. This keeps the same DOM and adds the keyboard
 * and focus behaviour that was missing.
 */
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
        <div className="popup-backdrop" onMouseDown={onClose}>
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={labelledBy}
                tabIndex={-1}
                className={cn("popup popup-default", className)}
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
