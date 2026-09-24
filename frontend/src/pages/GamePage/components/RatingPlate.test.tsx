import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import RatingPlate from "./RatingPlate";
import { BUCKET_COUNT, bucketOf } from "../lib/ratingBuckets";

/** Twenty empty buckets with a single rating in the one covering `rating`. */
const only = (rating: number): number[] => {
    const buckets = new Array<number>(BUCKET_COUNT).fill(0);
    buckets[bucketOf(rating)] = 1;
    return buckets;
};

const barsDrawn = (container: HTMLElement): number[] =>
    [...container.querySelectorAll("[role=img] span")]
        .map((el, i) => (el.classList.contains("bg-brand") ? i + 1 : 0))
        .filter(Boolean);

describe("RatingPlate", () => {
    it("draws a rating in its own bar, counting from 0.5", () => {
        for (const [rating, bar] of [
            [0.5, 1],
            [9.5, 19],
            [10, 20],
        ] as const) {
            const { container, unmount } = render(
                <RatingPlate
                    average={rating}
                    ratingCount={1}
                    buckets={only(rating)}
                />
            );
            expect(barsDrawn(container)).toEqual([bar]);
            unmount();
        }
    });

    it("says how many ratings there are, and the median with them", () => {
        const { container } = render(
            <RatingPlate average={9.5} ratingCount={1} buckets={only(9.5)} />
        );
        expect(container).toHaveTextContent("1 rating · median 9.50");
    });

    it("keeps its shape with nothing to chart", () => {
        const { container } = render(
            <RatingPlate
                average={null}
                ratingCount={0}
                buckets={new Array<number>(BUCKET_COUNT).fill(0)}
            />
        );
        expect(container).toHaveTextContent("No ratings yet");
        expect(container.querySelectorAll("[role=img] span")).toHaveLength(
            BUCKET_COUNT
        );
        expect(barsDrawn(container)).toEqual([]);
    });
});
