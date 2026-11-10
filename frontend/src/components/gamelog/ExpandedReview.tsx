import { useEffect, useRef, type ReactNode } from "react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { Textarea } from "../ui/Input";

interface ExpandedReviewProps {
    gameTitle?: string;
    value: string;
    onChange: (value: string) => void;
    maxLength: number;
    placeholder: string;
    /** The spoiler and visibility switches and the count, as the log
     *  editor shows them. */
    controls: ReactNode;
    onClose: () => void;
}

/**
 * The review field at the size of the screen, over the log editor. It edits
 * the editor's own draft as you type, so closing it is all "Done" does and
 * nothing written here can be lost by leaving another way.
 */
const ExpandedReview = ({
    gameTitle,
    value,
    onChange,
    maxLength,
    placeholder,
    controls,
    onClose,
}: ExpandedReviewProps) => {
    const fieldRef = useRef<HTMLTextAreaElement>(null);

    // Runs after Modal's own focus, so the caret lands where writing left off.
    useEffect(() => {
        const field = fieldRef.current;
        if (!field) return;
        field.focus();
        field.setSelectionRange(field.value.length, field.value.length);
    }, []);

    return (
        <Modal
            onClose={onClose}
            labelledBy="expanded-review-title"
            className="flex h-[88dvh] w-full max-w-[960px] flex-col gap-4 sm:h-[90dvh]"
        >
            <h2
                id="expanded-review-title"
                className="pr-10 font-display text-[22px] leading-tight text-content sm:text-[28px]"
            >
                {gameTitle ?? "Your review"}
            </h2>
            <div className="flex flex-wrap items-center gap-3.5">
                {controls}
            </div>
            <Textarea
                ref={fieldRef}
                maxLength={maxLength}
                aria-label="Review"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="min-h-0 flex-1 leading-relaxed"
            />
            <Button onClick={onClose} className="w-full sm:ml-auto sm:w-auto">
                Done
            </Button>
        </Modal>
    );
};

export default ExpandedReview;
