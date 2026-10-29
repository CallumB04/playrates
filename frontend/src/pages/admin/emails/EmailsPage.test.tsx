import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { EmailStats } from "@playrates/shared";
import { server } from "../../../test/msw/server";
import { renderWithProviders } from "../../../test/renderWithProviders";
import EmailsPage from "./EmailsPage";

const API = "http://localhost:3000/api/v1";

const stats = (overrides: Partial<EmailStats> = {}): EmailStats => ({
    last24h: { sent: 80, capped: 6, failed: 0 },
    resend: { sent: 97, more: false, bounced: 2, complained: 1 },
    days: [{ day: "2026-11-10", sent: 80, capped: 6, failed: 0 }],
    kinds: [{ kind: "friend_request", sent: 80 }],
    broadcasts: { count: 1, recipients: 240 },
    newsSubscribers: 240,
    ...overrides,
});

const open = (body: EmailStats) => {
    server.use(
        http.get(`${API}/admin/email/stats`, () => HttpResponse.json(body))
    );
    renderWithProviders(<EmailsPage />);
};

describe("EmailsPage", () => {
    it("says when the cap held emails back, and what bounced", async () => {
        open(stats());

        expect(
            await screen.findByText("6 held back by the cap")
        ).toBeInTheDocument();
        expect(
            screen.getByText("80 from PlayRates, 17 account emails")
        ).toBeInTheDocument();
        expect(
            screen.getByText(/2 bounced · 1 marked as spam/)
        ).toBeInTheDocument();
        expect(screen.getByText("Friend requests")).toBeInTheDocument();
    });

    it("counts by the log alone when Resend can't be asked", async () => {
        open(
            stats({ resend: null, last24h: { sent: 3, capped: 0, failed: 0 } })
        );

        expect(
            await screen.findByText(
                "Resend couldn’t be asked, so account emails aren’t counted."
            )
        ).toBeInTheDocument();
        expect(
            screen.getByText("None held back by the cap")
        ).toBeInTheDocument();
        expect(screen.queryByText(/bounced/)).not.toBeInTheDocument();
    });
});
