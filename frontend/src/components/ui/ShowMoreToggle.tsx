import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/cn";

const ShowMoreToggle = ({
    open,
    onToggle,
    moreLabel = "Show more",
    className,
}: {
    open: boolean;
    onToggle: () => void;
    moreLabel?: string;
    className?: string;
}) => (
    <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={cn(
            "inline-flex min-h-11 cursor-pointer items-center gap-1 text-label text-brand lift hover:text-brand-hover sm:min-h-0",
            className
        )}
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
);

export default ShowMoreToggle;
