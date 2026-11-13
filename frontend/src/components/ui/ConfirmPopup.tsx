import { useId, type ReactNode } from "react";
import Popup from "./Popup";
import Button from "./Button";

interface ConfirmPopupProps {
    title: string;
    /** The sentence under the title. Name the thing being acted on. */
    body: ReactNode;
    confirmLabel: string;
    tone?: "danger" | "neutral";
    isPending?: boolean;
    onConfirm: () => void;
    onClose: () => void;
    /** Anything to settle before confirming, like a switch. */
    children?: ReactNode;
}

/** One confirmation dialog for every "are you sure?" in the app, in the
 *  frame every popup shares. */
const ConfirmPopup = ({
    title,
    body,
    confirmLabel,
    tone = "danger",
    isPending = false,
    onConfirm,
    onClose,
    children,
}: ConfirmPopupProps) => {
    const titleId = useId();
    return (
        <Popup
            onClose={onClose}
            titleId={titleId}
            width="w-full sm:max-w-md"
            title={title}
            blurb={<p className="leading-relaxed">{body}</p>}
            tone={tone === "danger" ? "danger" : "brand"}
            footer={
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button
                        variant="secondary"
                        onClick={onClose}
                        disabled={isPending}
                    >
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
            }
        >
            {children}
        </Popup>
    );
};

export default ConfirmPopup;
