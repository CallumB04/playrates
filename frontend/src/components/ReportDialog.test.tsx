import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../test/msw/server";
import { renderWithProviders } from "../test/renderWithProviders";
import ReportDialog from "./ReportDialog";

const API = "http://localhost:3000/api/v1";

describe("ReportDialog", () => {
    it("won't send until a reason is picked", async () => {
        renderWithProviders(
            <ReportDialog targetType="review" targetId={7} onClose={vi.fn()} />
        );

        expect(
            screen.getByRole("button", { name: "Send report" })
        ).toBeDisabled();
        await userEvent.click(screen.getByLabelText("Spam or advertising"));
        expect(
            screen.getByRole("button", { name: "Send report" })
        ).toBeEnabled();
    });

    it("sends the target, reason and details, then closes", async () => {
        let sent: unknown;
        server.use(
            http.post(`${API}/reports`, async ({ request }) => {
                sent = await request.json();
                return new HttpResponse(null, { status: 201 });
            })
        );
        const onClose = vi.fn();
        renderWithProviders(
            <ReportDialog
                targetType="message"
                targetId={42}
                onClose={onClose}
            />
        );

        await userEvent.click(screen.getByLabelText("Bullying or harassment"));
        await userEvent.type(
            screen.getByLabelText("Anything else I should know?"),
            "  Third time this week  "
        );
        await userEvent.click(
            screen.getByRole("button", { name: "Send report" })
        );

        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(sent).toEqual({
            targetType: "message",
            targetId: "42",
            reason: "harassment",
            details: "Third time this week",
        });
    });

    it("closes quietly when it was already reported", async () => {
        server.use(
            http.post(`${API}/reports`, () =>
                HttpResponse.json(
                    {
                        error: {
                            code: "already_reported",
                            message: "You've already reported this",
                        },
                    },
                    { status: 409 }
                )
            )
        );
        const onClose = vi.fn();
        renderWithProviders(
            <ReportDialog targetType="thread" targetId={1} onClose={onClose} />
        );

        await userEvent.click(screen.getByLabelText("Something else"));
        await userEvent.click(
            screen.getByRole("button", { name: "Send report" })
        );

        await waitFor(() => expect(onClose).toHaveBeenCalled());
    });

    it("keeps the dialog open and says so when sending fails", async () => {
        server.use(
            http.post(`${API}/reports`, () =>
                HttpResponse.json(
                    { error: { code: "internal", message: "" } },
                    { status: 500 }
                )
            )
        );
        const onClose = vi.fn();
        renderWithProviders(
            <ReportDialog
                targetType="profile"
                targetId="u1"
                onClose={onClose}
            />
        );

        await userEvent.click(screen.getByLabelText("Something illegal"));
        await userEvent.click(
            screen.getByRole("button", { name: "Send report" })
        );

        expect(
            await screen.findByText(/Couldn't send that report/)
        ).toBeInTheDocument();
        expect(onClose).not.toHaveBeenCalled();
    });
});
