import { AppError } from "./AppError.js";

/**
 * The rule that fixes the entire old authorization model: the acting user is
 * always taken from the verified JWT, never from a URL parameter or request
 * body. The old friends routes read the actor from `req.body.id`, so anyone
 * could send or accept a friend request as anyone else.
 *
 * Call these in services, not controllers — a service is reachable from more
 * than one route, so putting the check there means it cannot be forgotten.
 */
export function assertOwner(callerId: string, ownerId: string): void {
    if (callerId !== ownerId) {
        throw AppError.forbidden("You do not own this resource");
    }
}

/**
 * A review is visible when it is public, or when the viewer wrote it.
 *
 * The old API never checked the `public` flag at all, so private reviews were
 * served to everyone.
 */
export function canViewReview(
    viewerId: string | undefined,
    review: { isPublic: boolean; authorId: string }
): boolean {
    return review.isPublic || viewerId === review.authorId;
}
