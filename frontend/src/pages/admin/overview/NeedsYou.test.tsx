import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { AdminAttention, AdminHealth } from "@playrates/shared";
import { server } from "../../../test/msw/server";
import { renderWithProviders } from "../../../test/renderWithProviders";
import NeedsYou from "./NeedsYou";

const API = "http://localhost:3000/api/v1";

const health: AdminHealth = {
    checkedAt: "2026-11-17T12:00:00Z",
    api: { ok: true, uptimeSeconds: 60, commit: null, region: null, node: "" },
    database: { ok: true, latencyMs: 30, error: null },
    igdb: {
        configured: true,
        todayRequests: 4,
        todayFailures: 0,
        lastRequestAt: "2026-11-17T11:00:00Z",
        lastFailureAt: null,
        lastError: null,
    },
    errors: { last24h: 0, lastAt: null },
};

const open = (attention: Partial<AdminAttention>) => {
    server.use(
        http.get(`${API}/admin/health`, () => HttpResponse.json(health)),
        http.get(`${API}/admin/attention`, () =>
            HttpResponse.json({
                reports: 0,
                serverErrors: 0,
                clientErrors: 0,
                patchNotes: 0,
                ...attention,
            })
        )
    );
    const onHealth = vi.fn();
    renderWithProviders(<NeedsYou onHealth={onHealth} />);
    return { onHealth, user: userEvent.setup() };
};

describe("NeedsYou", () => {
    it("links each thing waiting to where it's dealt with", async () => {
        open({ reports: 2, clientErrors: 1, patchNotes: 1 });

        expect(
            await screen.findByRole("link", { name: /2\s*reports to look at/ })
        ).toHaveAttribute("href", "/admin/reports");
        expect(
            screen.getByRole("link", { name: /1\s*error in the last day/ })
        ).toHaveAttribute("href", "/admin/health");
        expect(
            screen.getByRole("link", { name: /patch notes entry to send/ })
        ).toHaveAttribute("href", "/admin/announcements?view=patch-notes");
    });

    it("says when nothing needs the admin, and opens the health check from there", async () => {
        const { onHealth, user } = open({});

        await user.click(
            await screen.findByRole("button", {
                name: "Nothing needs you. Everything is answering.",
            })
        );
        expect(onHealth).toHaveBeenCalled();
        expect(screen.queryByRole("link")).not.toBeInTheDocument();
    });
});
