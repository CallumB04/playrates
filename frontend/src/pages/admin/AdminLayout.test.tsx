import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../../test/msw/server";
import { renderWithProviders } from "../../test/renderWithProviders";
import AdminLayout from "./AdminLayout";

const API = "http://localhost:3000/api/v1";

const waiting = (counts: {
    reports?: number;
    serverErrors?: number;
    clientErrors?: number;
    patchNotes?: number;
}) =>
    server.use(
        http.get(`${API}/admin/attention`, () =>
            HttpResponse.json({
                reports: 0,
                serverErrors: 0,
                clientErrors: 0,
                patchNotes: 0,
                ...counts,
            })
        )
    );

const nav = () => screen.getByRole("navigation", { name: "Admin" });

describe("AdminLayout", () => {
    it("counts what waits beside the views it waits in", async () => {
        waiting({ reports: 3, serverErrors: 1, clientErrors: 2 });
        renderWithProviders(<AdminLayout />, { route: "/admin/overview" });

        expect(
            await within(nav()).findByRole("link", {
                name: /^Reports\W+3 open reports$/,
            })
        ).toHaveAttribute("href", "/admin/reports");
        expect(
            within(nav()).getByRole("link", {
                name: /^Health\W+3 errors in the last day$/,
            })
        ).toBeInTheDocument();
    });

    it("shows no count where nothing waits", async () => {
        waiting({ reports: 2 });
        renderWithProviders(<AdminLayout />, { route: "/admin/overview" });

        await within(nav()).findByRole("link", { name: /open reports/ });
        expect(
            within(nav()).getByRole("link", { name: "Health" })
        ).toBeInTheDocument();
        expect(
            within(nav()).getByRole("link", { name: "Announcements" })
        ).toBeInTheDocument();
    });

    it("keeps the views opened now and then under More, and names the one open", async () => {
        const user = userEvent.setup();
        renderWithProviders(<AdminLayout />, { route: "/admin/progress" });

        expect(
            within(nav()).queryByRole("link", { name: "Progress" })
        ).not.toBeInTheDocument();
        const more = within(nav()).getByRole("button", { name: "Progress" });
        await user.click(more);

        expect(more).toHaveAttribute("aria-expanded", "true");
        expect(
            within(nav()).getByRole("link", { name: "Design library" })
        ).toHaveAttribute("href", "/admin/design");

        await user.keyboard("{Escape}");
        expect(more).toHaveAttribute("aria-expanded", "false");
    });

    it("tells a phone what waits in the other views", async () => {
        waiting({ reports: 2, patchNotes: 1 });
        renderWithProviders(<AdminLayout />, { route: "/admin/reports" });

        expect(
            await screen.findByRole("button", {
                name: /Reports.*1 waiting elsewhere/,
            })
        ).toBeInTheDocument();
    });
});
