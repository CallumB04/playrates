import type { ReviewWithAuthor } from "@playrates/shared";

export interface ReviewGroup {
    author: ReviewWithAuthor["author"];
    reviews: ReviewWithAuthor[];
}

/**
 * Someone who reviewed a game on two consoles is one voice with two takes,
 * so their reviews on a page sit together under one name, where the first
 * of them would have been. Only within the page: the sort decides the rest.
 */
export const groupByAuthor = (reviews: ReviewWithAuthor[]): ReviewGroup[] => {
    const groups: ReviewGroup[] = [];
    for (const review of reviews) {
        const group = groups.find((g) => g.author.id === review.author.id);
        if (group) group.reviews.push(review);
        else groups.push({ author: review.author, reviews: [review] });
    }
    return groups;
};
