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
                // Above the tab bar and the home indicator, until lg.
                "bottom-[calc(--spacing(4)+var(--spacing-tabbar)+env(safe-area-inset-bottom))]",
                "sm:inset-x-auto sm:right-8 sm:bottom-[calc(--spacing(8)+var(--spacing-tabbar)+env(safe-area-inset-bottom))] sm:w-96",
                "lg:bottom-8",
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
