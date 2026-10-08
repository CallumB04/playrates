import type { ReviewWithAuthor } from "@playrates/shared";

export interface ReviewGroup {
    author: ReviewWithAuthor["author"];
    reviews: ReviewWithAuthor[];
}

/**
 * Someone who reviewed a game on two consoles is one voice with two takes,
 * so their reviews on a page sit together under one name, where the first
 * of them would have been. Only within the page: the sort decides the rest.
 * Private accounts never group: two takes together would say they were one
 * person's.
 */
export const groupByAuthor = (reviews: ReviewWithAuthor[]): ReviewGroup[] => {
    const groups: ReviewGroup[] = [];
    for (const review of reviews) {
        const { author } = review;
        const group = author
            ? groups.find((g) => g.author?.id === author.id)
            : undefined;
        if (group) group.reviews.push(review);
        else groups.push({ author: review.author, reviews: [review] });
    }
    return groups;
};
