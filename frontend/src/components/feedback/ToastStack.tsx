import { useNotificationState } from "../../contexts/NotificationContext";
import Toast from "./Toast";

/**
 * Reads from context, so no component has to thread a callback through. The
 * list is always mounted: a live region that already exists when a toast is
 * inserted into it is announced far more reliably than one that appears with
 * the toast.
 *
 * Full width along the bottom of a phone, a column in the corner from `sm`.
 */
const ToastStack = () => {
    const { toasts, dismiss, remove } = useNotificationState();

    return (
        <ol
            aria-label="Notifications"
            className={[
                "pointer-events-none fixed inset-x-4 z-50 flex flex-col",
                // Clears the home indicator; plain bottom-4 without an inset.
                "bottom-[calc(--spacing(4)+env(safe-area-inset-bottom))]",
                "sm:inset-x-auto sm:right-8 sm:bottom-8 sm:w-96",
            ].join(" ")}
        >
            {toasts.map((toast) => (
                <Toast
                    key={toast.id}
                    toast={toast}
                    onDismiss={dismiss}
                    onRemove={remove}
                />
            ))}
        </ol>
    );
};

export default ToastStack;
