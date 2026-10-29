import { describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CommunityMessage } from "@playrates/shared";
import { renderWithProviders } from "../../test/renderWithProviders";
import MessageItem from "./MessageItem";

const message: CommunityMessage = {
    id: 5,
    threadId: 1,
    parentId: null,
    author: { id: "a", username: "marlowe", avatarUrl: null, accent: "rose" },
    body: { type: "doc", content: [] },
    isOpening: false,
    deleted: false,
    createdAt: "2026-01-01T00:00:00Z",
    editedAt: null,
    voteCount: 0,
    votedByViewer: false,
    myReaction: null,
    reactions: [],
    canEdit: false,
    canDelete: true,
    replies: [],
};

describe("MessageItem", () => {
    // On a phone they wrapped every message's row; behind "…" they don't.
    it("offers delete and report from the phone's sheet", async () => {
        const onDelete = vi.fn();
        const onReport = vi.fn();
        renderWithProviders(
            <MessageItem
                message={message}
                viewerId="b"
                actions={{
                    onVote: vi.fn(),
                    onSaveEdit: vi.fn(),
                    onDelete,
                    onReport,
                }}
            />
        );

        await userEvent.click(
            screen.getByRole("button", { name: "More actions" })
        );
        const sheet = screen.getByRole("dialog", { name: "Message" });
        await userEvent.click(
            within(sheet).getByRole("button", { name: "Report" })
        );
        expect(onReport).toHaveBeenCalledWith(message);
        expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("has no sheet when there's nothing to put in it", () => {
        renderWithProviders(
            <MessageItem
                message={{ ...message, canDelete: false }}
                viewerId={undefined}
                actions={{
                    onVote: vi.fn(),
                    onSaveEdit: vi.fn(),
                    onDelete: vi.fn(),
                }}
            />
        );
        expect(
            screen.queryByRole("button", { name: "More actions" })
        ).toBeNull();
    });
});
