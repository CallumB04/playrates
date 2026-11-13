import { useEffect, useRef, type ReactNode } from "react";
import Popup from "../ui/Popup";
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
        <Popup
            onClose={onClose}
            titleId="expanded-review-title"
            width="w-full sm:max-w-[960px]"
            title={gameTitle ?? "Your review"}
            footer={
                <div className="flex">
                    <Button
                        onClick={onClose}
                        className="w-full sm:ml-auto sm:w-auto"
                    >
                        Done
                    </Button>
                </div>
            }
        >
            <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-3.5">
                    {controls}
                </div>
                {/* Sized to the screen rather than stretched to fill the
                    panel: the frame's body doesn't grow. */}
                <Textarea
                    ref={fieldRef}
                    maxLength={maxLength}
                    aria-label="Review"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="h-[50dvh] leading-relaxed sm:h-[60dvh]"
                />
            </div>
        </Popup>
    );
};

export default ExpandedReview;
