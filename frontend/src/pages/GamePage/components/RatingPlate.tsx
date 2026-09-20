import { formatCount, formatRating } from "../../../lib/format";
import { cn } from "../../../lib/cn";

interface RatingPlateProps {
    average: number | null;
    ratingCount: number;
    /** Twenty buckets of 0.5. */
    buckets: number[];
}

/**
 * The median, to the nearest half point. Bucket i covers [i/2, (i+1)/2), so
 * the figure is its lower edge — a lone 9.00 rating has a median of 9.00, not
 * of the top of the bucket it sits in.
 */
const medianOf = (buckets: number[]): number | null => {
    const total = buckets.reduce((a, b) => a + b, 0);
    if (total === 0) return null;
    const middle = total / 2;
    let seen = 0;
    for (let i = 0; i < buckets.length; i++) {
        seen += buckets[i] ?? 0;
        if (seen >= middle) return i / 2;
    }
    return null;
};

/**
 * The distribution plate. A mean alone can't tell a divisive game from a
 * consistently mediocre one, so the shape is the point — the figure is just
 * the headline on it.
 */
const RatingPlate = ({ average, ratingCount, buckets }: RatingPlateProps) => {
    const peak = Math.max(1, ...buckets);
    const median = medianOf(buckets);
    const averageBucket =
        average === null ? -1 : Math.min(buckets.length - 1, Math.floor(average * 2));

    return (
        <section className="grid items-center gap-6 border border-strong bg-surface-raised px-5 py-5 shadow-lip sm:grid-cols-[186px_minmax(0,1fr)]">
            <div className="sm:border-r sm:border-subtle sm:pr-5">
                <h2 className="text-label text-content-muted">
                    PlayRates average
                </h2>
                <p
                    className={cn(
                        "mt-2 font-mono text-figure",
                        average === null ? "text-content-muted" : "text-brand"
                    )}
                >
                    {formatRating(average)}
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
                <div
                    className="flex h-[74px] items-end gap-[3px]"
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
                                "min-h-px flex-1",
                                i === averageBucket
                                    ? "bg-brand"
                                    : i > averageBucket - 4 && i < averageBucket + 4
                                      ? "bg-brand-muted"
                                      : "bg-strong"
                            )}
                            style={{
                                height: `${Math.round((count / peak) * 74)}px`,
                            }}
                        />
                    ))}
                </div>
                <div className="mt-2 flex justify-between border-t border-strong pt-2 font-mono text-[10px] text-content-muted">
                    {["0", "2.5", "5", "7.5", "10"].map((tick) => (
                        <span key={tick}>{tick}</span>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default RatingPlate;
