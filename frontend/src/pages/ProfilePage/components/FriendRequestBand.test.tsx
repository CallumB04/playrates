import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FriendRequestBand from "./FriendRequestBand";

const PROFILE = {
    username: "cinderlane",
    avatarUrl: null,
    accent: "indigo",
} as const;

describe("FriendRequestBand", () => {
    it("says who asked, and answers either way", async () => {
        const onAccept = vi.fn();
        const onDecline = vi.fn();
        render(
            <FriendRequestBand
                profile={PROFILE}
                isPending={false}
                onAccept={onAccept}
                onDecline={onDecline}
            />
        );

        expect(screen.getByText(/sent you a friend request/)).toHaveTextContent(
            "cinderlane sent you a friend request"
        );

        await userEvent.click(screen.getByRole("button", { name: "Decline" }));
        expect(onDecline).toHaveBeenCalledOnce();
        await userEvent.click(screen.getByRole("button", { name: "Accept" }));
        expect(onAccept).toHaveBeenCalledOnce();
    });

    /* A second press while the first is out would send it twice. */
    it("holds both answers while one is on its way", () => {
        render(
            <FriendRequestBand
                profile={PROFILE}
                isPending
                onAccept={vi.fn()}
                onDecline={vi.fn()}
            />
        );
        expect(screen.getByRole("button", { name: "Accept" })).toBeDisabled();
        expect(screen.getByRole("button", { name: "Decline" })).toBeDisabled();
    });
});
