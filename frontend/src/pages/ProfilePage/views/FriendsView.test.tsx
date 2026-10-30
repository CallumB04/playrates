import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { buildFriendEdge, buildProfile } from "../../../test/msw/handlers";
import { renderWithProviders } from "../../../test/renderWithProviders";
import FriendsView from "./FriendsView";

// The same user each render, as AuthContext gives it.
const auth = vi.hoisted(() => ({ user: null as unknown }));
vi.mock("../../../contexts/AuthContext", () => ({ useAuth: () => auth }));
auth.user = buildProfile({ username: "devuser" });

describe("FriendsView", () => {
    it("asks you to invite people when you have no friends yet", async () => {
        renderWithProviders(
            <FriendsView edges={[]} isLoading={false} isOwner />
        );
        expect(
            screen.getByText(
                "Invite people you know, or find some in the community."
            )
        ).toBeInTheDocument();
        expect(
            screen.getByRole("link", { name: "Find people in Community" })
        ).toHaveAttribute("href", "/community");

        await userEvent.click(
            screen.getByRole("button", { name: "Invite friends" })
        );
        expect(
            await screen.findByRole("dialog", { name: /Invite friends/ })
        ).toBeInTheDocument();
    });

    it("keeps a way to invite more beside a list of friends", () => {
        renderWithProviders(
            <FriendsView
                edges={[buildFriendEdge()]}
                isLoading={false}
                isOwner
            />
        );
        expect(
            screen.getByRole("button", { name: "Invite friends" })
        ).toBeInTheDocument();
    });

    it("offers nothing on someone else's", () => {
        renderWithProviders(
            <FriendsView edges={[]} isLoading={false} isOwner={false} />
        );
        expect(screen.getByText("No friends yet")).toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: "Invite friends" })
        ).toBeNull();
    });
});
