import { cn } from "../../lib/cn";

/** Still, not shimmering. Aria-hidden throughout — the region that owns the
 *  placeholder carries the live status. */
export const Skeleton = ({
    className,
    round = false,
}: {
    className?: string;
    /** A circle or a pill, for an avatar or a tag: as a class beside the
     *  default rounding, either could win. */
    round?: boolean;
}) => (
    <span
        aria-hidden="true"
        className={cn(
            "block animate-pulse bg-surface-sunken",
            round ? "rounded-full" : "rounded-sm",
            className
        )}
    />
);

/** The 3:4 cover well plus its platform / rating ledger line. */
export const TileSkeleton = () => (
    <div aria-hidden="true">
        <div className="aspect-3/4 animate-pulse rounded-md bg-surface-sunken" />
        <div className="mt-2 flex items-center gap-1.5">
            <Skeleton className="h-2 w-[34px]" />
            <span className="flex-1" />
            <Skeleton className="h-2.5 w-[26px]" />
        </div>
    </div>
);

/** Ragged lines, so a paragraph placeholder reads as prose. */
export const TextSkeleton = ({ lines = 3 }: { lines?: number }) => {
    const widths = ["w-[78%]", "w-[94%]", "w-[56%]", "w-[88%]", "w-[67%]"];
    return (
        <div aria-hidden="true" className="flex flex-col gap-2">
            {Array.from({ length: lines }, (_, i) => (
                <Skeleton
                    key={i}
                    className={cn("h-3", widths[i % widths.length])}
                />
            ))}
        </div>
    );
};

export default Skeleton;
