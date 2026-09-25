import { describe, expect, it } from "vitest";
import { BUCKET_COUNT, bucketOf, medianOf } from "./ratingBuckets";

describe("bucketOf", () => {
    /* The bug this pins: width_bucket counted from zero, so every rating drew
       one bar to the right of where it reads, and 10 shared the 9.5s' bar. */
    it("gives each half point its own bar, 0.5 first and 10 last", () => {
        expect(bucketOf(0.5)).toBe(0);
        expect(bucketOf(5)).toBe(9);
        expect(bucketOf(9.5)).toBe(18);
        expect(bucketOf(10)).toBe(BUCKET_COUNT - 1);
    });
});

describe("medianOf", () => {
    const only = (rating: number): number[] => {
        const buckets = new Array<number>(BUCKET_COUNT).fill(0);
        buckets[bucketOf(rating)] = 1;
        return buckets;
    };

    it("reads a bucket as its upper edge, the only rating it can hold", () => {
        expect(medianOf(only(0.5))).toBe(0.5);
        expect(medianOf(only(6.5))).toBe(6.5);
        expect(medianOf(only(9.5))).toBe(9.5);
        expect(medianOf(only(10))).toBe(10);
    });

    it("takes the lower of two middles, so it lands on a real rating", () => {
        const buckets = new Array<number>(BUCKET_COUNT).fill(0);
        buckets[bucketOf(4)] = 1;
        buckets[bucketOf(8)] = 1;
        expect(medianOf(buckets)).toBe(4);
    });

    it("has no median without a rating", () => {
        expect(medianOf(new Array<number>(BUCKET_COUNT).fill(0))).toBeNull();
    });
});
