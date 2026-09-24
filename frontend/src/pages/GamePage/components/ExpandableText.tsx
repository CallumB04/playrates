import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../../lib/cn";

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
 * Prose, a few lines at a time: a RAWG description runs to a dozen paragraphs
 * on a big release, and a review can run as long as someone likes.
 *
 * The expander only appears when there is something behind it, which is
 * measured rather than guessed — a character count is not a line count, and it
 * is wrong at every width but one.
 */
const ExpandableText = ({
    text,
    lines = 4,
    moreLabel,
    className,
}: ExpandableTextProps) => {
    const [open, setOpen] = useState(false);
    const [clipped, setClipped] = useState(false);
    const bodyRef = useRef<HTMLParagraphElement>(null);

    useEffect(() => {
        const el = bodyRef.current;
        if (!el) return;

        const measure = () => {
            // Measured while clamped: is there more than fits?
            setClipped(el.scrollHeight > el.clientHeight + 1);
        };

        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(el);
        return () => observer.disconnect();
    }, [text]);

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
                <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    aria-expanded={open}
                    className="mt-2 inline-flex min-h-11 cursor-pointer items-center gap-1 text-label text-brand lift hover:text-brand-hover sm:min-h-0"
                >
                    {open ? "Show less" : moreLabel}
                    <ChevronDown
                        size={14}
                        aria-hidden
                        className={cn(
                            "transition-transform duration-200",
                            open && "rotate-180"
                        )}
                    />
                </button>
            )}
        </div>
    );
};

export default ExpandableText;
