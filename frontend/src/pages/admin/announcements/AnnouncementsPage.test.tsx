import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import {
    ANNOUNCEMENT_BODY_MAX,
    ANNOUNCEMENT_TITLE_MAX,
} from "@playrates/shared";
import { server } from "../../../test/msw/server";
import { renderWithProviders } from "../../../test/renderWithProviders";
import AnnouncementsPage from "./AnnouncementsPage";

const API = "http://localhost:3000/api/v1";

const sent = vi.fn();
const tested = vi.fn();

beforeEach(() => {
    sent.mockClear();
    tested.mockClear();
    server.use(
        http.get(`${API}/admin/announcements`, () => HttpResponse.json([])),
        http.get(`${API}/community/patch-notes`, () =>
            HttpResponse.json({ thread: { id: 7 }, latest: null })
        ),
        http.get(`${API}/admin/patch-notes`, () => HttpResponse.json([])),
        http.get(`${API}/admin/stats/overview`, () =>
            HttpResponse.json({ totals: { users: 3 }, series: [], period: {} })
        ),
        http.post(`${API}/admin/announcements/test`, async ({ request }) => {
            tested(await request.json());
            return new HttpResponse(null, { status: 204 });
        }),
        http.post(`${API}/admin/announcements`, async ({ request }) => {
            const body = (await request.json()) as Record<string, unknown>;
            sent(body);
            return HttpResponse.json(
                {
                    ...body,
                    id: 1,
                    createdAt: "2026-09-26T00:00:00Z",
                    retractedAt: null,
                    recipientCount: 3,
                    readCount: 0,
                },
                { status: 201 }
            );
        })
    );
});

const write = async (fields: {
    title?: string;
    body?: string;
    link?: string;
}) => {
    const user = userEvent.setup();
    if (fields.title !== undefined)
        await user.type(screen.getByLabelText("Title"), fields.title);
    if (fields.body !== undefined)
        await user.type(screen.getByLabelText("Message"), fields.body);
    if (fields.link !== undefined)
        await user.type(screen.getByLabelText("Link (optional)"), fields.link);
    return user;
};

describe("AnnouncementsPage", () => {
    it("holds back an empty announcement", () => {
        renderWithProviders(<AnnouncementsPage />);
        expect(
            screen.getByRole("button", { name: /Send test to me/ })
        ).toBeDisabled();
        expect(screen.getByRole("button", { name: /Send to/ })).toBeDisabled();
    });

    it("counts against the title limit and refuses to send past it", async () => {
        renderWithProviders(<AnnouncementsPage />);
        await write({
            title: "x".repeat(ANNOUNCEMENT_TITLE_MAX + 1),
            body: "Hello",
        });

        expect(
            screen.getByText(
                `${ANNOUNCEMENT_TITLE_MAX + 1}/${ANNOUNCEMENT_TITLE_MAX}`
            )
        ).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Send to/ })).toBeDisabled();
    });

    it("refuses a link to another site", async () => {
        renderWithProviders(<AnnouncementsPage />);
        await write({
            title: "Hi",
            body: "There",
            link: "https://example.com",
        });

        expect(
            screen.getByText("An in-app path, like /community")
        ).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Send to/ })).toBeDisabled();
    });

    // Pasted, because user.type reads "[" as the start of a key name.
    const writeMessage = async (body: string) => {
        const user = await write({ title: "PlayRates has a Discord" });
        await user.click(screen.getByLabelText("Message"));
        await user.paste(body);
    };

    it("counts only a link's words, and shows the link in the preview", async () => {
        renderWithProviders(<AnnouncementsPage />);
        await writeMessage("[Join the Discord](https://discord.gg/abc) today");

        expect(
            screen.getByText(`22/${ANNOUNCEMENT_BODY_MAX}`)
        ).toBeInTheDocument();
        const bell = screen.getByText("How it will look").parentElement!;
        expect(
            within(bell).getByRole("link", { name: "Join the Discord" })
        ).toHaveAttribute("href", "https://discord.gg/abc");
        expect(screen.getByRole("button", { name: /Send to/ })).toBeEnabled();
    });

    it("refuses a link in the message that isn't https or a page here", async () => {
        renderWithProviders(<AnnouncementsPage />);
        await writeMessage("[our site](http://example.com)");

        expect(
            screen.getByText(
                "Links go to an https:// address or a page on PlayRates"
            )
        ).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Send to/ })).toBeDisabled();
    });

    it("shows the draft as the bell will", async () => {
        renderWithProviders(<AnnouncementsPage />);
        await write({ title: "Lists are here", body: "Share one." });

        const bell = screen.getByText("How it will look").parentElement!;
        expect(within(bell).getByText("Lists are here")).toBeInTheDocument();
        expect(within(bell).getByText("Share one.")).toBeInTheDocument();
    });

    it("sends a test to the admin alone, without asking", async () => {
        renderWithProviders(<AnnouncementsPage />);
        const user = await write({ title: "Hi", body: "There" });

        await user.click(
            screen.getByRole("button", { name: /Send test to me/ })
        );

        await waitFor(() =>
            expect(tested).toHaveBeenCalledWith({
                tone: "update",
                title: "Hi",
                body: "There",
                link: null,
            })
        );
        expect(sent).not.toHaveBeenCalled();
    });

    it("asks before sending to everyone, then sends and clears the form", async () => {
        renderWithProviders(<AnnouncementsPage />);
        const user = await write({
            title: "Hi",
            body: "There",
            link: "/community",
        });

        await user.click(
            await screen.findByRole("button", { name: "Send to 3 people" })
        );
        expect(sent).not.toHaveBeenCalled();

        const dialog = screen.getByRole("dialog");
        await user.click(within(dialog).getByRole("button", { name: "Send" }));

        await waitFor(() =>
            expect(sent).toHaveBeenCalledWith({
                tone: "update",
                title: "Hi",
                body: "There",
                link: "/community",
            })
        );
        await waitFor(() =>
            expect(screen.getByLabelText("Title")).toHaveValue("")
        );
    });
});
