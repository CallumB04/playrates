import { describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CommunityMessage, ThreadDetail } from "@playrates/shared";
import { renderWithProviders } from "../../../test/renderWithProviders";
import PatchNotesThread from "./PatchNotesThread";

const entry = (
    id: number,
    title: string,
    createdAt: string
): CommunityMessage => ({
    id,
    threadId: 1,
    parentId: null,
    author: { id: "a", username: "team", avatarUrl: null, accent: "lime" },
    body: { type: "doc", content: [] },
    isOpening: false,
    deleted: false,
    createdAt,
    editedAt: null,
    voteCount: 0,
    votedByViewer: false,
    myReaction: null,
    reactions: [],
    canEdit: false,
    canDelete: false,
    replies: [],
    patchNote: {
        title,
        intro: null,
        items: [{ kind: "fix", text: `Fixed in ${title}`, link: null }],
        outro: null,
    },
});

const RELEASES = [
    entry(10, "v1.0 - Official Launch", "2026-10-03T12:00:00Z"),
    entry(11, "v1.1", "2026-10-29T12:00:00Z"),
];

const detail = (canPost: boolean, messages = RELEASES): ThreadDetail => ({
    thread: {
        id: 1,
        title: "PlayRates patch notes",
        subject: { kind: "patch_notes" },
        author: null,
        createdAt: "2026-10-01T00:00:00Z",
        lastActivityAt: "2026-11-01T00:00:00Z",
        messageCount: 2,
        contributorCount: 1,
        contributors: [],
        recentMessageCount: 0,
    },
    // Oldest first, as the API gives them.
    messages,
    canPost,
    canDeleteThread: false,
});

const render = (canPost = false, onPost = vi.fn(), messages = RELEASES) =>
    renderWithProviders(
        <PatchNotesThread
            detail={detail(canPost, messages)}
            viewerId={undefined}
            actions={{
                onVote: vi.fn(),
                onSaveEdit: vi.fn(),
                onDelete: vi.fn(),
            }}
            landedOn={null}
            onPost={onPost}
        />,
        { route: "/community/thread/1" }
    );

describe("PatchNotesThread", () => {
    it("heads each release with its version, newest first and marked latest", () => {
        render();
        const releases = screen.getAllByRole("article");
        expect(
            within(releases[0]!).getByRole("heading", { level: 2 })
        ).toHaveTextContent("v1.1");
        expect(within(releases[0]!).getByText("Latest")).toBeInTheDocument();
        // The version, then its name beside it.
        expect(
            within(releases[1]!).getByRole("heading", { level: 2 })
        ).toHaveTextContent("v1.0Official Launch");
        expect(within(releases[1]!).queryByText("Latest")).toBeNull();
    });

    it("lists every release to jump to", () => {
        render();
        const index = screen.getByRole("navigation", { name: "Releases" });
        const links = within(index).getAllByRole("link");
        expect(links.map((l) => l.getAttribute("href"))).toEqual([
            "/community/thread/1#message-11",
            "/community/thread/1#message-10",
        ]);
    });

    /* The rail's 9.5rem column stayed when the rail didn't, and the one
       release was squeezed into it. */
    it("gives a lone release the full width, with no rail beside it", () => {
        render(false, vi.fn(), [RELEASES[0]!]);
        expect(
            screen.queryByRole("navigation", { name: "Releases" })
        ).toBeNull();
        const column =
            screen.getByRole("article").parentElement!.parentElement!;
        expect(column.className).not.toContain("grid-cols");

        render();
        const columns = screen.getByRole("navigation", {
            name: "Releases",
        }).parentElement!;
        expect(columns.className).toContain("lg:grid-cols-[9.5rem");
    });

    it("keeps the editor out of the way until it's asked for", async () => {
        const user = userEvent.setup();
        render(true);
        expect(screen.queryByLabelText("Title")).toBeNull();
        await user.click(
            screen.getByRole("button", { name: /Write patch notes/ })
        );
        expect(screen.getByLabelText("Title")).toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Cancel" }));
        expect(screen.queryByLabelText("Title")).toBeNull();
    });

    it("offers no editor to a reader", () => {
        render(false);
        expect(
            screen.queryByRole("button", { name: /Write patch notes/ })
        ).toBeNull();
    });
});
