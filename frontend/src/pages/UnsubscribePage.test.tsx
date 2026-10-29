import { StrictMode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { EmailScope } from "@playrates/shared";
import { server } from "../test/msw/server";
import { renderWithProviders } from "../test/renderWithProviders";
import UnsubscribePage from "./UnsubscribePage";

const API = "http://localhost:3000/api/v1";
const TOKEN = "signed-token-for-friend-requests";

const unsubscribed = vi.fn();
const resubscribed = vi.fn();
let scope: EmailScope = "friend_requests";

beforeEach(() => {
    scope = "friend_requests";
    unsubscribed.mockClear();
    resubscribed.mockClear();
    server.use(
        http.post(`${API}/email/unsubscribe`, async ({ request }) => {
            const body = (await request.json()) as { scope?: EmailScope };
            unsubscribed({
                query: new URL(request.url).searchParams.get("t"),
                body,
            });
            const acted = body.scope ?? scope;
            return HttpResponse.json({
                scope: acted,
                label: acted === "all" ? "PlayRates" : "Friend requests",
                on: false,
            });
        }),
        http.post(`${API}/email/resubscribe`, async ({ request }) => {
            const body = (await request.json()) as { scope?: EmailScope };
            resubscribed(body);
            const acted = body.scope ?? scope;
            return HttpResponse.json({
                scope: acted,
                label: acted === "all" ? "PlayRates" : "Friend requests",
                on: true,
            });
        })
    );
});

const open = (route = `/unsubscribe?t=${TOKEN}`) => {
    // StrictMode runs the effect twice, as it does in development.
    renderWithProviders(
        <StrictMode>
            <UnsubscribePage />
        </StrictMode>,
        { route }
    );
    return userEvent.setup();
};

describe("UnsubscribePage", () => {
    it("unsubscribes once on arrival, with no second click", async () => {
        open();

        expect(
            await screen.findByText(
                "You won't get emails about friend requests any more."
            )
        ).toBeInTheDocument();
        expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
            "You're unsubscribed"
        );
        expect(unsubscribed).toHaveBeenCalledTimes(1);
        expect(unsubscribed).toHaveBeenCalledWith({
            query: TOKEN,
            body: { token: TOKEN },
        });
    });

    it("subscribes again on Undo", async () => {
        const u = open();

        await u.click(await screen.findByRole("button", { name: "Undo" }));

        expect(
            await screen.findByText(
                "You'll get emails about friend requests again."
            )
        ).toBeInTheDocument();
        expect(resubscribed).toHaveBeenCalledWith({ token: TOKEN });
    });

    it("says a bad link doesn't work, and points to the settings", async () => {
        server.use(
            http.post(`${API}/email/unsubscribe`, () =>
                HttpResponse.json(
                    { error: { code: "invalid_token" } },
                    { status: 400 }
                )
            )
        );
        open();

        expect(
            await screen.findByText("That link doesn't work")
        ).toBeInTheDocument();
        expect(
            screen.getByRole("link", { name: "Email settings" })
        ).toHaveAttribute("href", "/settings?section=emails");
    });

    it("doesn't try a link with no token in it", () => {
        open("/unsubscribe");

        expect(screen.getByText("That link doesn't work")).toBeInTheDocument();
        expect(unsubscribed).not.toHaveBeenCalled();
    });

    // The link's own token turns off the rest too, so it never touches
    // whoever happens to be signed in on this browser.
    it("turns every email off from the link, and Undo takes it back", async () => {
        const u = open();

        await u.click(
            await screen.findByRole("button", { name: "Turn off all emails" })
        );

        await waitFor(() =>
            expect(unsubscribed).toHaveBeenLastCalledWith({
                query: TOKEN,
                body: { token: TOKEN, scope: "all" },
            })
        );
        expect(
            await screen.findByText(
                "You won't get any more emails from PlayRates, apart from account ones like password resets."
            )
        ).toBeInTheDocument();

        await u.click(screen.getByRole("button", { name: "Undo" }));
        await waitFor(() =>
            expect(resubscribed).toHaveBeenCalledWith({
                token: TOKEN,
                scope: "all",
            })
        );
        expect(
            await screen.findByText(
                "You won't get emails about friend requests any more."
            )
        ).toBeInTheDocument();
    });

    it("has nothing more to turn off from an unsubscribe-from-all link", async () => {
        scope = "all";
        open();

        expect(
            await screen.findByText(
                "You won't get any more emails from PlayRates, apart from account ones like password resets."
            )
        ).toBeInTheDocument();
        expect(
            screen.queryByText("Turn off all emails")
        ).not.toBeInTheDocument();
    });
});
