import type { ReactNode } from "react";
import Modal from "./Modal";
import Button from "./Button";
import { cn } from "../../lib/cn";

interface ConfirmPopupProps {
    title: string;
    /** The sentence under the title. Name the thing being acted on. */
    body: ReactNode;
    confirmLabel: string;
    tone?: "danger" | "neutral";
    isPending?: boolean;
    onConfirm: () => void;
    onClose: () => void;
}

/** One confirmation dialog for every "are you sure?" in the app. Same heading
 *  and rule as the other popups. */
const ConfirmPopup = ({
    title,
    body,
    confirmLabel,
    tone = "danger",
    isPending = false,
    onConfirm,
    onClose,
}: ConfirmPopupProps) => (
    <Modal
        onClose={onClose}
        labelledBy="confirm-title"
        className="w-full max-w-md"
    >
        <h2
            id="confirm-title"
            className={cn(
                "border-b border-subtle pb-3 font-display text-section",
                tone === "danger" ? "text-danger" : "text-content"
            )}
        >
            {title}
        </h2>

        <p className="pt-4 text-body-sm leading-relaxed text-content-secondary">
            {body}
        </p>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={onClose} disabled={isPending}>
                Cancel
            </Button>
            <Button
                variant={tone === "danger" ? "danger" : "primary"}
                onClick={onConfirm}
                disabled={isPending}
            >
                {confirmLabel}
            </Button>
        </div>
    </Modal>
);

export default ConfirmPopup;
