import RatingBadge from "../../../components/ui/RatingBadge";
import { cardClass } from "../../../components/ui/Card";
import { formatCount, formatRating } from "../../../lib/format";
import { cn } from "../../../lib/cn";
import { medianOf } from "../lib/ratingBuckets";

interface RatingPlateProps {
    average: number | null;
    ratingCount: number;
    /** Twenty buckets of 0.5, the first (0, 0.5] and the last (9.5, 10]. */
    buckets: number[];
}

const MAX = 10;
const PLOT_HEIGHT = 74;

/* A mean alone can't tell a divisive game from a consistently mediocre one,
   so the shape is the point and the figure is the headline on it. */
const RatingPlate = ({ average, ratingCount, buckets }: RatingPlateProps) => {
    const peak = Math.max(1, ...buckets);
    const median = medianOf(buckets);

    return (
        <section
            className={cardClass(
                "grid items-center gap-6 px-5 py-5 sm:grid-cols-[auto_minmax(0,1fr)]",
                { padding: "none" }
            )}
        >
            <div className="sm:border-r sm:border-subtle sm:pr-6">
                <h2 className="text-label text-content-muted">
                    PlayRates average
                </h2>
                <p className="mt-2 whitespace-nowrap">
                    <RatingBadge value={average} size="lg" />
                </p>
                <p className="mt-1.5 text-body-sm text-content-muted">
                    {ratingCount === 0
                        ? "No ratings yet"
                        : `${formatCount(ratingCount)} ${
                              ratingCount === 1 ? "rating" : "ratings"
                          }${median !== null ? ` · median ${formatRating(median)}` : ""}`}
                </p>
            </div>

            <div>
                <div className="relative" style={{ height: PLOT_HEIGHT }}>
                    <div
                        className="flex h-full items-end gap-[3px]"
                        role="img"
                        aria-label={
                            ratingCount === 0
                                ? "No ratings to chart"
                                : `Rating distribution across ${formatCount(ratingCount)} ratings`
                        }
                    >
                        {buckets.map((count, i) => (
                            <span
                                key={i}
                                className={cn(
                                    "min-h-px flex-1 rounded-t-xs",
                                    count > 0 ? "bg-brand" : "bg-strong"
                                )}
                                style={{
                                    height: `${Math.round((count / peak) * PLOT_HEIGHT)}px`,
                                }}
                            />
                        ))}
                    </div>

                    {/* The average gets its own marker rather than tinting a
                        bucket, which looked like data when the bucket was
                        empty. */}
                    {average !== null && (
                        <span
                            aria-hidden
                            className="absolute inset-y-0 w-px bg-accent"
                            style={{ left: `${(average / MAX) * 100}%` }}
                        >
                            <span className="absolute -top-0.5 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-accent" />
                        </span>
                    )}
                </div>
                <div className="mt-2 flex justify-between border-t border-subtle pt-2 font-mono text-[10px] text-content-muted">
                    {["0", "2.5", "5", "7.5", "10"].map((tick) => (
                        <span key={tick}>{tick}</span>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default RatingPlate;
