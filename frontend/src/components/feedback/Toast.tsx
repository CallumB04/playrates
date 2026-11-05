import { useEffect } from "react";
import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import type {
    NotificationType,
    Toast as ToastModel,
} from "../../contexts/notificationQueue";
import type { IconComponent } from "../../lib/icons";
import { cn } from "../../lib/cn";

/** Must outlast the toast-leave animation in theme.css. */
export const EXIT_MS = 240;

interface Tone {
    icon: string;
    /** The line along the bottom edge, in the same tone as the icon. */
    line: string;
    Icon: IconComponent;
}

/** Static map: every type has an entry, so the lookup cannot miss. */
const TONES: Record<NotificationType, Tone> = {
    success: {
        icon: "text-success",
        line: "bg-success",
        Icon: CircleCheck,
    },
    info: {
        icon: "text-info",
        line: "bg-info",
        Icon: Info,
    },
    error: {
        icon: "text-danger",
        line: "bg-danger",
        Icon: CircleAlert,
    },
};

interface ToastProps {
    toast: ToastModel;
    onDismiss: (id: number) => void;
    onRemove: (id: number) => void;
}

/**
 * One toast, owning its own clocks. Mounted once per id, so the dwell starts
 * when the toast appears and stays in step with the countdown line, which CSS
 * drives from the same number of milliseconds.
 */
const Toast = ({ toast, onDismiss, onRemove }: ToastProps) => {
    const { id, text, type, dwell, leaving, action } = toast;
    const { icon, line, Icon } = TONES[type];

    useEffect(() => {
        if (leaving || dwell === null) return;
        const timer = setTimeout(() => onDismiss(id), dwell);
        return () => clearTimeout(timer);
    }, [dwell, id, leaving, onDismiss]);

    useEffect(() => {
        if (!leaving) return;
        const timer = setTimeout(() => onRemove(id), EXIT_MS);
        return () => clearTimeout(timer);
    }, [id, leaving, onRemove]);

    return (
        // The row collapses as well as fades, so the toasts above it slide
        // down rather than jumping once this one is gone.
        <li
            className={cn(
                "grid grid-rows-[1fr] pt-2.5",
                leaving ? "animate-toast-leave" : "animate-toast-enter"
            )}
        >
            <div className="min-h-0 overflow-hidden">
                <div
                    role={type === "error" ? "alert" : "status"}
                    // The same plate as every other surface: ambient shadow and
                    // a rim of light along the top edge. The status is the
                    // icon's job and the countdown line's, not the card's.
                    className={cn(
                        "pointer-events-auto relative flex items-center gap-3 overflow-hidden rounded-md",
                        "border border-subtle bg-surface-raised py-3 pr-2 pl-3.5",
                        "shadow-toast inset-shadow-deep"
                    )}
                >
                    <Icon
                        size={16}
                        aria-hidden
                        className={cn("shrink-0", icon)}
                    />
                    {/* The action sits on the line it answers, as a word
                        rather than a button of its own under it. */}
                    <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-3 gap-y-1">
                        <p className="min-w-0 flex-1 text-body-sm text-content">
                            {text}
                        </p>
                        {action && (
                            <button
                                type="button"
                                onClick={() => {
                                    action.onClick();
                                    onDismiss(id);
                                }}
                                className={cn(
                                    "relative -my-1 shrink-0 cursor-pointer rounded-xs px-2 py-1 text-body-sm font-semibold text-brand-text transition-colors",
                                    "hover:bg-brand-subtle",
                                    // 44px of touch around a 28px label.
                                    "before:absolute before:-inset-x-1 before:-inset-y-2 before:content-['']",
                                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                                )}
                            >
                                {action.label}
                            </button>
                        )}
                    </div>
                    <button
                        type="button"
                        aria-label="Dismiss notification"
                        onClick={() => onDismiss(id)}
                        className={cn(
                            "relative flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-xs lift",
                            "text-content-muted hover:bg-surface-hover hover:text-content",
                            // 44px of touch around a 28px glyph.
                            "before:absolute before:-inset-2 before:content-['']",
                            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                        )}
                    >
                        <X size={15} />
                    </button>

                    {/* Every toast carries the line: it is part of the card's
                        shape, and one without it sits short at the bottom.
                        Only a toast on a clock drains it. */}
                    <span
                        aria-hidden
                        style={
                            dwell === null
                                ? undefined
                                : { animationDuration: `${dwell}ms` }
                        }
                        className={cn(
                            "absolute inset-x-0 bottom-0 h-0.5 origin-left",
                            dwell !== null && "animate-toast-countdown",
                            line
                        )}
                    />
                </div>
            </div>
        </li>
    );
};

export default Toast;
