import { AppError } from "./AppError.js";

/**
 * The acting user always comes from the verified JWT, never a param or body.
 * Call these from services, not controllers — a service is reachable from more
 * than one route, so adding a route can't skip the check.
 */
export function assertOwner(callerId: string, ownerId: string): void {
  if (callerId !== ownerId) {
    throw AppError.forbidden("You do not own this resource");
  }
}

/** A review is visible when it is public, or when the viewer wrote it. */
export function canViewReview(
  viewerId: string | undefined,
  review: { isPublic: boolean; authorId: string },
): boolean {
  return review.isPublic || viewerId === review.authorId;
}
