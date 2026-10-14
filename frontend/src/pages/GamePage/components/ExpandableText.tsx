import { useRef, useState } from "react";
import { cn } from "../../../lib/cn";
import { useClamped } from "../../../hooks/useClamped";
import ShowMoreToggle from "../../../components/ui/ShowMoreToggle";

/** Complete class strings — Tailwind only emits what it finds literally. */
const CLAMP = {
    3: "line-clamp-3",
    4: "line-clamp-4",
} as const;

interface ExpandableTextProps {
    text: string;
    /** How much is shown before the expander. */
    lines?: keyof typeof CLAMP;
    /** What the expander says when there is more to read. */
    moreLabel: string;
    /** Type for the body, which differs between a description and a review. */
    className?: string;
}

/**
 * Prose, a few lines at a time: a game description can run to a dozen paragraphs
 * on a big release, and a review can run as long as someone likes.
 *
 * The expander only appears when there is something behind it.
 */
const ExpandableText = ({
    text,
    lines = 4,
    moreLabel,
    className,
}: ExpandableTextProps) => {
    const [open, setOpen] = useState(false);
    const bodyRef = useRef<HTMLParagraphElement>(null);
    const clipped = useClamped(bodyRef, text);

    return (
        <div>
            <p
                ref={bodyRef}
                className={cn(
                    // The blank lines are the author's paragraphs.
                    "leading-relaxed whitespace-pre-line text-content-secondary",
                    className,
                    !open && CLAMP[lines]
                )}
            >
                {text}
            </p>

            {(clipped || open) && (
                <ShowMoreToggle
                    open={open}
                    onToggle={() => setOpen((v) => !v)}
                    moreLabel={moreLabel}
                    className="mt-2"
                />
            )}
        </div>
    );
};

export default ExpandableText;
