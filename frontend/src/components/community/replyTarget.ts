import type { CommunityMessage } from "@playrates/shared";

/**
 * The parent a reply to `message` is posted under. Replies nest one level:
 * answering a reply joins its parent's replies, and answering the opening
 * message starts a top-level message of its own. The API applies the same
 * rule; working it out here is what puts the composer in the right place.
 */
export const replyParentId = (
    message: Pick<CommunityMessage, "id" | "parentId" | "isOpening">
): number | null =>
    message.isOpening ? null : (message.parentId ?? message.id);
