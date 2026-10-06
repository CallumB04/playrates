import { useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import GameCover from "../../../components/game/GameCover";
import { cn } from "../../../lib/cn";

export interface Cover {
    url: string | null;
    /** What this cover is: "Complete Edition", "Japan". None for the main one. */
    label: string | null;
}

interface CoverCarouselProps {
    covers: Cover[];
    title: string;
    /** Sits over the cover, whichever one is showing: a status stamp. */
    overlay?: ReactNode;
    className?: string;
}

const ARROW =
    "relative grid size-8 cursor-pointer place-items-center rounded-full bg-surface-raised/85 text-content shadow-e2 backdrop-blur-sm lift " +
    "before:absolute before:-inset-1.5 before:content-[''] " +
    "hover:bg-surface-raised disabled:cursor-default disabled:opacity-0 " +
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

/**
 * The main cover, and any others the game has (special editions, regional
 * releases) a swipe or a press away. A real scroll track, so a phone
 * swipes it natively; the arrows are for everyone else.
 */
const CoverCarousel = ({
    covers,
    title,
    overlay,
    className,
}: CoverCarouselProps) => {
    const trackRef = useRef<HTMLDivElement>(null);
    const [index, setIndex] = useState(0);
    const many = covers.length > 1;

    const show = (next: number) => {
        const el = trackRef.current;
        const clamped = Math.max(0, Math.min(covers.length - 1, next));
        setIndex(clamped);
        el?.scrollTo?.({ left: clamped * el.clientWidth, behavior: "smooth" });
    };

    // Swiping moves the track; the dots and label follow it.
    const onScroll = () => {
        const el = trackRef.current;
        if (!el || el.clientWidth === 0) return;
        setIndex(Math.round(el.scrollLeft / el.clientWidth));
    };

    const current = covers[index];

    return (
        <div className={className}>
            <div className="relative aspect-3/4 overflow-hidden rounded-lg bg-surface-media shadow-e3">
                <div
                    ref={trackRef}
                    onScroll={onScroll}
                    className={cn(
                        "flex size-full snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto [contain:layout] [&::-webkit-scrollbar]:hidden",
                        !many && "overflow-hidden"
                    )}
                >
                    {covers.map((cover, i) => (
                        <GameCover
                            key={`${cover.url}-${i}`}
                            coverUrl={cover.url}
                            title={
                                cover.label ? `${title}, ${cover.label}` : title
                            }
                            className="size-full shrink-0 snap-center"
                        />
                    ))}
                </div>
                {overlay}
                {many && (
                    <div className="pointer-events-none absolute inset-x-2 top-1/2 flex -translate-y-1/2 justify-between">
                        <button
                            type="button"
                            aria-label="Previous cover"
                            disabled={index === 0}
                            onClick={() => show(index - 1)}
                            className={cn(ARROW, "pointer-events-auto")}
                        >
                            <ChevronLeft size={16} aria-hidden />
                        </button>
                        <button
                            type="button"
                            aria-label="Next cover"
                            disabled={index === covers.length - 1}
                            onClick={() => show(index + 1)}
                            className={cn(ARROW, "pointer-events-auto")}
                        >
                            <ChevronRight size={16} aria-hidden />
                        </button>
                    </div>
                )}
            </div>

            {many && (
                <div className="mt-2.5 flex items-center justify-between gap-3">
                    <span
                        aria-live="polite"
                        className="truncate text-label-sm text-content-muted"
                    >
                        {current?.label ?? "Main cover"} · {index + 1} of{" "}
                        {covers.length}
                    </span>
                    {/* Where you are, not something to press: a dot this
                        size is too small a target, and the arrows and a
                        swipe already move it. */}
                    <span
                        aria-hidden
                        className="flex shrink-0 items-center gap-1.5"
                    >
                        {covers.map((cover, i) => (
                            <span
                                key={`${cover.url}-${i}`}
                                className={cn(
                                    "size-1.5 rounded-full transition-colors",
                                    i === index
                                        ? "bg-content"
                                        : "bg-content-muted/40"
                                )}
                            />
                        ))}
                    </span>
                </div>
            )}
        </div>
    );
};

export default CoverCarousel;
