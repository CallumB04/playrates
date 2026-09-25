import { useEffect, useId, useRef, useState } from "react";
import { Bell } from "lucide-react";
import Modal from "../ui/Modal";
import NotificationPanel from "../notifications/NotificationPanel";
import { useNotifications } from "../../hooks/queries/useNotifications";
import { cn } from "../../lib/cn";

/** Past this the badge stops being a number and starts being a hint. */
const BADGE_CAP = 9;

/** Matches `sm` in the theme, where the sheet gives way to the popover. */
const useIsPhone = (): boolean => {
    const [isPhone, setIsPhone] = useState(
        () => !window.matchMedia("(min-width: 640px)").matches
    );

    useEffect(() => {
        const wide = window.matchMedia("(min-width: 640px)");
        const sync = () => setIsPhone(!wide.matches);
        sync();
        wide.addEventListener("change", sync);
        return () => wide.removeEventListener("change", sync);
    }, []);

    return isPhone;
};

/**
 * The bell, and the inbox behind it. A bottom sheet below `sm`, a popover
 * anchored to the bell from there up.
 *
 * The unread count comes from the same query the panel lists, so opening the
 * menu costs nothing and the badge is never a request behind the list.
 */
const NotificationMenu = () => {
    const [open, setOpen] = useState(false);
    const wrapRef = useRef<HTMLDivElement>(null);
    const isPhone = useIsPhone();
    const titleId = useId();

    const { data } = useNotifications(false);
    const unread = data?.unread ?? 0;

    useEffect(() => {
        if (!open || isPhone) return;

        const onPointerDown = (event: MouseEvent) => {
            if (!wrapRef.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOpen(false);
        };

        document.addEventListener("mousedown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("mousedown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [open, isPhone]);

    const close = () => setOpen(false);

    return (
        <div ref={wrapRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-haspopup="dialog"
                aria-label={
                    unread > 0
                        ? `Notifications, ${unread} unread`
                        : "Notifications"
                }
                className={cn(
                    "relative flex size-11 items-center justify-center rounded-sm lift hover:text-brand",
                    open ? "text-brand" : "text-content"
                )}
            >
                <Bell size={20} />
                {unread > 0 && (
                    <span
                        aria-hidden
                        className="absolute top-1.5 right-1.5 grid min-w-4 place-items-center rounded-full border border-surface bg-brand px-1 text-stamp font-semibold text-content-on-solid"
                    >
                        {unread > BADGE_CAP ? `${BADGE_CAP}+` : unread}
                    </span>
                )}
            </button>

            {open &&
                (isPhone ? (
                    /* w-full, or the sheet shrinks to its contents — an
                       empty archive left it a small box adrift in the middle
                       of the screen. */
                    <Modal
                        onClose={close}
                        labelledBy={titleId}
                        className="w-full"
                    >
                        <NotificationPanel
                            onNavigate={close}
                            titleId={titleId}
                        />
                    </Modal>
                ) : (
                    <div
                        role="dialog"
                        aria-labelledby={titleId}
                        className="absolute top-[calc(100%+0.6rem)] right-0 z-40 w-[24rem] animate-settle rounded-lg border border-subtle bg-surface-raised p-3 shadow-modal"
                    >
                        <NotificationPanel
                            onNavigate={close}
                            titleId={titleId}
                        />
                    </div>
                ))}
        </div>
    );
};

export default NotificationMenu;
