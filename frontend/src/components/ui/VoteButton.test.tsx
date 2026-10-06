import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import VoteButton from "./VoteButton";

describe("VoteButton", () => {
    it("shows the vote the moment it is pressed, before the server answers", async () => {
        const onToggle = vi.fn(() => new Promise(() => {}));
        render(<VoteButton count={3} voted={false} onToggle={onToggle} />);

        await userEvent.click(screen.getByRole("button"));

        const button = screen.getByRole("button", {
            name: "Remove your upvote",
        });
        expect(button).toHaveAttribute("aria-pressed", "true");
        expect(button).toHaveTextContent("4");
    });

    it("takes the vote back when the request fails", async () => {
        const onToggle = vi.fn(() => Promise.reject(new Error("offline")));
        render(<VoteButton count={3} voted={false} onToggle={onToggle} />);

        await userEvent.click(screen.getByRole("button"));

        await waitFor(() =>
            expect(screen.getByRole("button")).toHaveAttribute(
                "aria-pressed",
                "false"
            )
        );
        expect(screen.getByRole("button")).toHaveTextContent("3");
    });

    it("settles on what the server says once it answers", async () => {
        const { rerender } = render(
            <VoteButton count={3} voted={false} onToggle={() => undefined} />
        );
        await userEvent.click(screen.getByRole("button"));

        rerender(<VoteButton count={9} voted onToggle={() => undefined} />);

        expect(screen.getByRole("button")).toHaveTextContent("9");
    });
});
