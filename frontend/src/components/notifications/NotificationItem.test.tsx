import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { AppNotification } from "@playrates/shared";
import { server } from "../../test/msw/server";
import { renderWithProviders } from "../../test/renderWithProviders";
import NotificationItem from "./NotificationItem";

const API = "http://localhost:3000/api/v1";

const welcome = (overrides: Partial<AppNotification> = {}): AppNotification =>
    ({
        id: 1,
        kind: "welcome",
        createdAt: "2026-01-01T00:00:00.000Z",
        readAt: null,
        archivedAt: null,
        ...overrides,
    }) as AppNotification;

/** Captures the PATCH body, since that is what the row's controls are for. */
const capturePatch = () => {
    const seen = vi.fn();
    server.use(
        http.patch(`${API}/me/notifications/:id`, async ({ request }) => {
            seen(await request.json());
            return HttpResponse.json(welcome());
        })
    );
    return seen;
};

const renderItem = (notification: AppNotification) =>
    renderWithProviders(
        <ul>
            <NotificationItem
                notification={notification}
                onNavigate={() => {}}
            />
        </ul>
    );

describe("NotificationItem", () => {
    it("renders the copy registered against the kind", () => {
        renderItem(welcome());

        expect(screen.getByText("Welcome to PlayRates")).toBeInTheDocument();
    });

    /* A kind the server knows and this build does not must still draw a row
       rather than take the menu down with it. */
    it("falls back to a plain row for a kind it cannot render", () => {
        renderItem(welcome({ kind: "unknown" } as Partial<AppNotification>));

        expect(screen.getByText("Something happened")).toBeInTheDocument();
    });

    it("offers to read an unread notification, and to unread a read one", () => {
        const { unmount } = renderItem(welcome());
        expect(
            screen.getByRole("button", { name: "Mark as read" })
        ).toBeInTheDocument();
        unmount();

        renderItem(welcome({ readAt: "2026-01-02T00:00:00.000Z" }));
        expect(
            screen.getByRole("button", { name: "Mark as unread" })
        ).toBeInTheDocument();
    });

    it("marks an unread notification read", async () => {
        const seen = capturePatch();
        renderItem(welcome());

        await userEvent.click(
            screen.getByRole("button", { name: "Mark as read" })
        );

        await waitFor(() => expect(seen).toHaveBeenCalledWith({ read: true }));
    });

    it("archives from the inbox and restores from the archive", async () => {
        const seen = capturePatch();
        const { unmount } = renderItem(welcome());

        await userEvent.click(screen.getByRole("button", { name: "Archive" }));
        await waitFor(() =>
            expect(seen).toHaveBeenCalledWith({ archived: true })
        );
        unmount();

        renderItem(
            welcome({
                readAt: "2026-01-02T00:00:00.000Z",
                archivedAt: "2026-01-02T00:00:00.000Z",
            })
        );
        await userEvent.click(
            screen.getByRole("button", { name: "Move back to inbox" })
        );

        await waitFor(() =>
            expect(seen).toHaveBeenCalledWith({ archived: false })
        );
    });
});
