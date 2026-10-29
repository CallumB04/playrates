import { afterEach, describe, expect, it, vi } from "vitest";
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import CheckInbox, { RESEND_WAIT_S } from "./CheckInbox";

const resendConfirmation = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("../../contexts/AuthContext", () => ({
    useAuth: () => ({ resendConfirmation }),
}));

afterEach(() => vi.useRealTimers());

describe("CheckInbox", () => {
    it("says where the link went, with a way into that inbox", () => {
        renderWithProviders(
            <CheckInbox
                email="callum@gmail.com"
                justSent
                onStartAgain={vi.fn()}
            />
        );
        expect(screen.getByText("callum@gmail.com")).toBeInTheDocument();
        expect(
            screen.getByRole("link", { name: /Open Gmail/ })
        ).toHaveAttribute("href", expect.stringContaining("mail.google.com"));
    });

    // Supabase refuses another inside a minute; the button says when.
    it("holds another link back for a minute after one is sent", () => {
        vi.useFakeTimers();
        renderWithProviders(
            <CheckInbox email="a@b.test" justSent onStartAgain={vi.fn()} />
        );
        expect(
            screen.getByRole("button", {
                name: `Send another in ${RESEND_WAIT_S}s`,
            })
        ).toBeDisabled();
        // One second at a time: each tick is set as the last one lands.
        for (let i = 0; i < RESEND_WAIT_S; i++)
            act(() => vi.advanceTimersByTime(1000));
        expect(
            screen.getByRole("button", { name: "Send another link" })
        ).toBeEnabled();
    });

    it("sends another at once when coming from log-in", async () => {
        renderWithProviders(
            <CheckInbox
                email="a@b.test"
                justSent={false}
                onStartAgain={vi.fn()}
            />
        );
        await userEvent.click(
            screen.getByRole("button", { name: "Send another link" })
        );
        expect(resendConfirmation).toHaveBeenCalledWith("a@b.test", undefined);
        expect(
            await screen.findByRole("button", { name: /Send another in/ })
        ).toBeDisabled();
    });

    it("goes back to sign-up for a mistyped address", async () => {
        const onStartAgain = vi.fn();
        renderWithProviders(
            <CheckInbox email="a@b.test" justSent onStartAgain={onStartAgain} />
        );
        await userEvent.click(
            screen.getByRole("button", { name: "Wrong address? Change it" })
        );
        expect(onStartAgain).toHaveBeenCalled();
    });
});
