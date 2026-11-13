import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import ClosePopupIcon from "../ClosePopupIcon";
import { useExit } from "../../hooks/useExit";
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
    /** The close button sits over art below md, as the log-in's does. */
    closeOverArt?: boolean;
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
    "fixed inset-0 z-50 flex h-dvh w-full items-end justify-center bg-overlay-backdrop backdrop-blur-sm motion-veil " +
    "sm:items-center sm:px-4";

/* Full width below sm whatever width the caller asks for: a sheet is the
   screen's width, and a max-w meant for the dialog left it short of the
   edges on a wide phone. */
/* No outline of its own: it takes focus to hold it inside, and a popup that
   opens by itself (a level up, the welcome) would otherwise wear the
   browser's ring round the whole sheet. Its controls keep theirs. */
const PANEL =
    "relative outline-none max-h-[88dvh] motion-dialog overflow-y-auto max-sm:w-full max-sm:max-w-none " +
    "rounded-t-lg border border-b-0 border-subtle bg-surface-raised p-4 shadow-sheet " +
    // Clears the home indicator; plain p-4 anywhere without an inset.
    "pb-[calc(--spacing(4)+env(safe-area-inset-bottom))] " +
    "sm:max-h-[90dvh] sm:rounded-lg sm:border-b sm:p-6 sm:shadow-modal";

const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';

const Modal = ({
    onClose,
    children,
    className,
    showCloseButton = true,
    labelledBy,
    closeOverArt = false,
}: ModalProps) => {
    const panelRef = useRef<HTMLDivElement>(null);
    const { leaving, leave } = useExit(panelRef);
    // Its own ways out play the exit; a caller closing it (after a save)
    // takes it away at once, as it always did.
    const close = () => leave(onClose);

    useOverlay(close);

    /* Tab and Shift+Tab go round the popup rather than out of it into the
       page behind, which a keyboard user can't see and shouldn't reach. */
    const trapTab = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key !== "Tab" || !panelRef.current) return;
        const focusable = [
            ...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
        ].filter((el) => !el.closest("[hidden], [inert]"));
        if (focusable.length === 0) {
            event.preventDefault();
            return;
        }
        const first = focusable[0]!;
        const last = focusable[focusable.length - 1]!;
        const active = document.activeElement;
        if (
            event.shiftKey &&
            (active === first || active === panelRef.current)
        ) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && active === last) {
            event.preventDefault();
            first.focus();
        }
    };

    // move focus into the popup, and back out when it closes
    useEffect(() => {
        const previouslyFocused = document.activeElement as HTMLElement | null;
        panelRef.current?.focus();
        return () => previouslyFocused?.focus?.();
    }, []);

    return createPortal(
        <div
            className={BACKDROP}
            data-leaving={leaving || undefined}
            onMouseDown={close}
        >
            <div
                ref={panelRef}
                data-leaving={leaving || undefined}
                role="dialog"
                aria-modal="true"
                aria-labelledby={labelledBy}
                tabIndex={-1}
                className={cn(PANEL, className)}
                onMouseDown={(event) => event.stopPropagation()}
                onKeyDown={trapTab}
            >
                {children}
                {showCloseButton && (
                    <ClosePopupIcon onClick={close} overArt={closeOverArt} />
                )}
            </div>
        </div>,
        document.body
    );
};

export default Modal;
