import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../../lib/cn";

/**
 * The description, four lines at a time.
 *
 * RAWG descriptions run to a dozen paragraphs on a big release, which pushed
 * the ratings and the reviews off the first screen. The expander only appears
 * when there is something behind it, so short descriptions are not given a
 * control that does nothing.
 */
const GameDescription = ({ text }: { text: string }) => {
    const [open, setOpen] = useState(false);
    const [clipped, setClipped] = useState(false);
    const bodyRef = useRef<HTMLParagraphElement>(null);

    useEffect(() => {
        const el = bodyRef.current;
        if (!el) return;

        const measure = () => {
            // Compared while clamped, so this is the honest question: is there
            // more text than the four lines currently showing?
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
                    "text-body leading-relaxed text-content-secondary",
                    !open && "line-clamp-4"
                )}
            >
                {text}
            </p>

            {(clipped || open) && (
                <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    aria-expanded={open}
                    className="lift mt-2 inline-flex cursor-pointer items-center gap-1 text-label text-brand hover:text-brand-hover"
                >
                    {open ? "Show less" : "Read the full description"}
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

export default GameDescription;
