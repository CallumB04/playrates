import { useEffect, useState, type RefObject } from "react";
import Button from "../../../components/ui/Button";
import { cn } from "../../../lib/cn";

interface StickyLogBarProps {
    /** Placed just after the page's own log buttons: the bar shows once
     *  they have scrolled away above the screen. */
    anchor: RefObject<HTMLElement>;
    label: string;
    onPress: () => void;
    disabled?: boolean;
}

/**
 * The game page's main action, kept under the thumb on a phone. Reading the
 * reviews or the related games put it a long scroll back up the page, so
 * the bar slides in once the buttons by the cover have gone.
 */
const StickyLogBar = ({
    anchor,
    label,
    onPress,
    disabled,
}: StickyLogBarProps) => {
    const [shown, setShown] = useState(false);

    useEffect(() => {
        const el = anchor.current;
        if (!el || typeof IntersectionObserver === "undefined") return;
        const observer = new IntersectionObserver(([entry]) =>
            setShown(
                !!entry &&
                    !entry.isIntersecting &&
                    entry.boundingClientRect.top < 0
            )
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [anchor]);

    return (
        <div
            aria-hidden={!shown}
            className={cn(
                "fixed inset-x-0 bottom-0 z-30 border-t border-subtle bg-surface/90 px-4 pt-3 pb-[calc(--spacing(3)+env(safe-area-inset-bottom))] backdrop-blur-lg transition-transform duration-200 sm:hidden",
                shown ? "translate-y-0" : "translate-y-full"
            )}
        >
            <Button
                size="lg"
                className="w-full"
                onClick={onPress}
                disabled={disabled}
                // off-screen, so out of the tab order too
                tabIndex={shown ? undefined : -1}
            >
                {label}
            </Button>
        </div>
    );
};

export default StickyLogBar;
