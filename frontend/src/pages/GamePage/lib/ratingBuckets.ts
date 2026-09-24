/** Twenty buckets of 0.5: bucket i holds the ratings in (i/2, (i+1)/2], so the
 *  first is 0.5 — the lowest rating there is — and the twentieth is 10. */
export const BUCKET_COUNT = 20;

/** The bucket a rating draws in, 0-based, mirroring game_rating_summary. */
export const bucketOf = (rating: number): number => Math.ceil(rating * 2) - 1;

/* The median, to the nearest half point. Every rating is a multiple of 0.5, so
   the only value a bucket can hold is its upper edge. */
export const medianOf = (buckets: number[]): number | null => {
    const total = buckets.reduce((a, b) => a + b, 0);
    if (total === 0) return null;
    const middle = total / 2;
    let seen = 0;
    for (let i = 0; i < buckets.length; i++) {
        seen += buckets[i] ?? 0;
        if (seen >= middle) return (i + 1) / 2;
    }
    return null;
};
