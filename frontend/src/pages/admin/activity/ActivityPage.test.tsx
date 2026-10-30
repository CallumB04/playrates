import { describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../../../test/msw/server";
import { renderWithProviders } from "../../../test/renderWithProviders";
import ActivityPage from "./ActivityPage";

const API = "http://localhost:3000/api/v1";

const open = (route = "/admin/activity") => {
    const asked: URLSearchParams[] = [];
    const counted: URLSearchParams[] = [];
    server.use(
        http.get(`${API}/admin/activity`, ({ request }) => {
            asked.push(new URL(request.url).searchParams);
            return HttpResponse.json({ data: [], nextBefore: null });
        }),
        http.get(`${API}/admin/activity/counts`, ({ request }) => {
            counted.push(new URL(request.url).searchParams);
            return HttpResponse.json({
                list_created: 2,
                list_loved: 3,
                level_up: 4,
            });
        })
    );
    renderWithProviders(<ActivityPage />, { route });
    return { asked, counted, user: userEvent.setup() };
};

describe("ActivityPage", () => {
    it("counts what's in each group, everything included", async () => {
        open();
        expect(
            await screen.findByRole("button", { name: "Everything 9" })
        ).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "Lists 5" })
        ).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "Progress 4" })
        ).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "Shop 0" })
        ).toBeInTheDocument();
    });

    it("opens a group's kinds, and asks for just the one picked", async () => {
        const { asked, user } = open();
        await user.click(
            await screen.findByRole("button", { name: "Lists 5" })
        );

        const kinds = screen.getByRole("group", { name: "Kinds of lists" });
        expect(
            within(kinds).getByRole("button", { name: "Lists loved 3" })
        ).toBeInTheDocument();
        await user.click(
            within(kinds).getByRole("button", { name: "Lists loved 3" })
        );

        await waitFor(() =>
            expect(asked.at(-1)?.get("kind")).toBe("list_loved")
        );
        expect(asked.at(-1)?.get("group")).toBe("lists");
    });

    it("counts and lists over the same period, from the link", async () => {
        const { asked, counted, user } = open("/admin/activity?period=week");
        await screen.findByRole("button", { name: "Everything 9" });
        expect(asked.at(-1)?.get("period")).toBe("week");
        expect(counted.at(-1)?.get("period")).toBe("week");

        await user.click(screen.getByRole("radio", { name: "All" }));
        await waitFor(() => expect(asked.at(-1)?.get("period")).toBeNull());
    });

    it("says which game it's narrowed to, and lets it go", async () => {
        const { asked, user } = open("/admin/activity?game=1");
        const applied = await screen.findByRole("button", {
            name: /, clear$/,
        });
        expect(asked.at(-1)?.get("gameId")).toBe("1");

        await user.click(applied);
        await waitFor(() => expect(asked.at(-1)?.get("gameId")).toBeNull());
    });
});
