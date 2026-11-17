import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "../../../test/msw/server";
import { renderWithProviders } from "../../../test/renderWithProviders";
import EventBadgeShelf from "./EventBadgeShelf";

const API = "http://localhost:3000/api/v1";

describe("EventBadgeShelf", () => {
    it("lists each event badge with the event it came from", async () => {
        server.use(
            http.get(`${API}/users/devuser/event-badges`, () =>
                HttpResponse.json([
                    {
                        key: "called-it",
                        name: "Called it",
                        description: "Picked the winner.",
                        icon: "trophy",
                        earnedAt: "2026-12-11T06:00:00.000Z",
                        event: {
                            slug: "the-game-awards-2026",
                            name: "The Game Awards 2026",
                            startsAt: "2026-12-11T03:30:00.000Z",
                            logo: "the-game-awards",
                        },
                    },
                ])
            )
        );
        renderWithProviders(<EventBadgeShelf username="devuser" />);
        expect(await screen.findByText("Called it")).toBeInTheDocument();
        expect(
            screen.getByRole("link", { name: "The Game Awards 2026" })
        ).toHaveAttribute("href", "/events/the-game-awards-2026");
    });

    it("shows nothing for someone with no event badges", async () => {
        const { container } = renderWithProviders(
            <EventBadgeShelf username="devuser" />
        );
        await new Promise((r) => setTimeout(r, 50));
        expect(container).toBeEmptyDOMElement();
    });
});
