import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoveButton from "./LoveButton";

describe("LoveButton", () => {
    it("fills and counts the love the moment it is pressed", async () => {
        const onToggle = vi.fn(() => new Promise(() => {}));
        render(<LoveButton count={3} loved={false} onToggle={onToggle} />);

        await userEvent.click(screen.getByRole("button"));

        const button = screen.getByRole("button");
        expect(button).toHaveAttribute("aria-pressed", "true");
        expect(button).toHaveTextContent("Loved");
        expect(button).toHaveTextContent("4");
    });

    it("takes the love back when the request fails", async () => {
        const onToggle = vi.fn(() => Promise.reject(new Error("offline")));
        render(<LoveButton count={3} loved={false} onToggle={onToggle} />);

        await userEvent.click(screen.getByRole("button"));

        await waitFor(() =>
            expect(screen.getByRole("button")).toHaveAttribute(
                "aria-pressed",
                "false"
            )
        );
        expect(screen.getByRole("button")).toHaveTextContent("3");
    });

    it("says why it can't be pressed, and keeps the count", () => {
        render(
            <LoveButton
                count={7}
                loved={false}
                onToggle={vi.fn()}
                disabledReason="Sign in to love it"
            />
        );
        const button = screen.getByRole("button", {
            name: "7 loves. Sign in to love it",
        });
        expect(button).toBeDisabled();
    });

    // A phone can't show the tooltip, so a signed-out press asks them in.
    it("asks a signed-out viewer to join rather than doing nothing", async () => {
        const onToggle = vi.fn();
        const onJoin = vi.fn();
        render(
            <LoveButton
                count={7}
                loved={false}
                onToggle={onToggle}
                disabledReason="Sign in to love it"
                onJoin={onJoin}
            />
        );
        await userEvent.click(screen.getByRole("button"));
        expect(onJoin).toHaveBeenCalled();
        expect(onToggle).not.toHaveBeenCalled();
        expect(screen.getByRole("button")).toHaveTextContent("7");
    });
});
