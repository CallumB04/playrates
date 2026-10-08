import { describe, expect, it } from "vitest";
import { buildReview } from "../../../test/msw/handlers";
import { groupByAuthor } from "./groupReviews";

const by = (id: string, reviewId: number) =>
    buildReview({
        id: reviewId,
        author: { ...buildReview().author!, id, username: id },
    });

describe("groupByAuthor", () => {
    it("puts one person's reviews together, where their first one was", () => {
        const groups = groupByAuthor([by("a", 1), by("b", 2), by("a", 3)]);

        expect(groups.map((g) => g.author?.id)).toEqual(["a", "b"]);
        expect(groups[0]!.reviews.map((r) => r.id)).toEqual([1, 3]);
    });

    it("leaves a page of single reviews in its order", () => {
        const groups = groupByAuthor([by("c", 1), by("a", 2), by("b", 3)]);
        expect(groups.map((g) => g.reviews[0]!.id)).toEqual([1, 2, 3]);
    });

    it("keeps each private account's review on its own", () => {
        const hidden = (reviewId: number) =>
            buildReview({ id: reviewId, author: null });
        const groups = groupByAuthor([hidden(1), hidden(2)]);
        expect(groups.map((g) => g.reviews.length)).toEqual([1, 1]);
    });
});
