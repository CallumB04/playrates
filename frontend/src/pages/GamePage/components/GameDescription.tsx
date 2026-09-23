import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../../lib/cn";

/**
 * The description, four lines at a time. RAWG runs to a dozen paragraphs on a
 * big release. The expander only appears when there is something behind it.
 */
const GameDescription = ({ text }: { text: string }) => {
    const [open, setOpen] = useState(false);
    const [clipped, setClipped] = useState(false);
    const bodyRef = useRef<HTMLParagraphElement>(null);

    useEffect(() => {
        const el = bodyRef.current;
        if (!el) return;

        const measure = () => {
            // Measured while clamped: is there more than the four lines?
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
                    className="mt-2 inline-flex min-h-11 cursor-pointer items-center gap-1 text-label text-brand lift hover:text-brand-hover sm:min-h-0"
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
