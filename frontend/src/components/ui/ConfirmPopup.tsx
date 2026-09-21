import type { ReactNode } from "react";
import { type LucideIcon } from "lucide-react";
import Modal from "./Modal";
import Button from "./Button";
import { cn } from "../../lib/cn";

interface ConfirmPopupProps {
    title: string;
    /** The sentence under the title. Name the thing being acted on. */
    body: ReactNode;
    icon: LucideIcon;
    confirmLabel: string;
    /** Destructive actions get the danger treatment on both icon and button. */
    tone?: "danger" | "neutral";
    isPending?: boolean;
    onConfirm: () => void;
    onClose: () => void;
}

/** One confirmation dialog for every "are you sure?" in the app. */
const ConfirmPopup = ({
    title,
    body,
    icon: Icon,
    confirmLabel,
    tone = "danger",
    isPending = false,
    onConfirm,
    onClose,
}: ConfirmPopupProps) => (
    <Modal onClose={onClose} labelledBy="confirm-title" className="max-w-md">
        <div className="flex gap-4 pr-6">
            <span
                className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-md",
                    tone === "danger"
                        ? "bg-danger-subtle text-danger"
                        : "bg-brand-subtle text-brand"
                )}
            >
                <Icon size={18} aria-hidden />
            </span>
            <div className="min-w-0">
                <h2
                    id="confirm-title"
                    className="font-display text-section text-content"
                >
                    {title}
                </h2>
                <p className="mt-1.5 text-body-sm leading-relaxed text-content-secondary">
                    {body}
                </p>
            </div>
        </div>

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
