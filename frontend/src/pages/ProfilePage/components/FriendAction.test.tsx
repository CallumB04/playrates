import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FriendAction from "./FriendAction";

describe("FriendAction", () => {
    /* Icons on a phone, but still named for what they do. */
    it("answers a request with Accept or Decline", async () => {
        const on = {
            onAdd: vi.fn(),
            onAccept: vi.fn(),
            onRemove: vi.fn(),
            onCancel: vi.fn(),
        };
        render(
            <FriendAction
                relation="request-received"
                isPending={false}
                {...on}
            />
        );

        await userEvent.click(screen.getByRole("button", { name: "Decline" }));
        expect(on.onRemove).toHaveBeenCalledOnce();

        await userEvent.click(screen.getByRole("button", { name: "Accept" }));
        expect(on.onAccept).toHaveBeenCalledOnce();
    });
});
