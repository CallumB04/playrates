import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ExpandedReview from "./ExpandedReview";

const Harness = ({ onClose = vi.fn() }: { onClose?: () => void }) => {
    const [body, setBody] = useState("Started strong");
    return (
        <>
            <p data-testid="draft">{body}</p>
            <ExpandedReview
                gameTitle="Hades"
                value={body}
                onChange={setBody}
                maxLength={5000}
                placeholder="Write your review"
                controls={<span>{body.length} / 5000</span>}
                onClose={onClose}
            />
        </>
    );
};

describe("ExpandedReview", () => {
    it("opens with the caret after what's already written", () => {
        render(<Harness />);
        const field = screen.getByRole<HTMLTextAreaElement>("textbox", {
            name: "Review",
        });
        expect(field).toHaveFocus();
        expect(field.selectionStart).toBe("Started strong".length);
    });

    it("writes straight into the editor's draft as you type", async () => {
        render(<Harness />);
        await userEvent.keyboard(", finished stronger");
        expect(screen.getByTestId("draft")).toHaveTextContent(
            "Started strong, finished stronger"
        );
        expect(screen.getByText("33 / 5000")).toBeInTheDocument();
    });

    it("closes on Done", async () => {
        const onClose = vi.fn();
        render(<Harness onClose={onClose} />);
        await userEvent.click(screen.getByRole("button", { name: "Done" }));
        expect(onClose).toHaveBeenCalledOnce();
    });
});
