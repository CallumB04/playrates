import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FriendAction from "./FriendAction";

const received = () => {
    const on = {
        onAdd: vi.fn(),
        onAccept: vi.fn(),
        onRemove: vi.fn(),
        onCancel: vi.fn(),
    };
    render(
        <FriendAction
            relation="request-received"
            username="cinderlane"
            isPending={false}
            {...on}
        />
    );
    return on;
};

describe("FriendAction", () => {
    it("answers a request in place where both words fit", async () => {
        const on = received();
        await userEvent.click(screen.getByRole("button", { name: "Accept" }));
        expect(on.onAccept).toHaveBeenCalledOnce();
    });

    /* A phone has room for one button beside the avatar. */
    it("answers from a sheet behind Respond", async () => {
        const on = received();
        await userEvent.click(screen.getByRole("button", { name: "Respond" }));

        const sheet = screen.getByRole("dialog", {
            name: "cinderlane sent you a friend request",
        });
        await userEvent.click(
            within(sheet).getByRole("button", { name: "Decline" })
        );

        expect(on.onRemove).toHaveBeenCalledOnce();
        expect(on.onAccept).not.toHaveBeenCalled();
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
});
