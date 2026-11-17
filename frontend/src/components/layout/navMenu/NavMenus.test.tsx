import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../../../test/msw/server";
import { renderWithProviders } from "../../../test/renderWithProviders";
import NavMenus from "./NavMenus";

const API = "http://localhost:3000/api/v1";

beforeEach(() => {
    server.use(
        http.get(`${API}/community/patch-notes`, () =>
            HttpResponse.json(null, { status: 404 })
        )
    );
});

afterEach(() => vi.useRealTimers());

const chevron = (name: string) =>
    screen.getByRole("button", { name: `More in ${name}` });

const item = (name: string) =>
    screen.getByRole("link", { name }).parentElement!;

describe("NavMenus", () => {
    it("opens a menu from its arrow, and shuts it on a second press", async () => {
        renderWithProviders(<NavMenus />);
        await userEvent.click(chevron("Library"));
        expect(chevron("Library")).toHaveAttribute("aria-expanded", "true");
        expect(
            await screen.findByRole("link", { name: "Highest rated" })
        ).toHaveAttribute("href", "/library?sort=rating");

        await userEvent.click(chevron("Library"));
        expect(chevron("Library")).toHaveAttribute("aria-expanded", "false");
    });

    it("opens a link's menu from the keyboard with the down arrow", async () => {
        renderWithProviders(<NavMenus />);
        screen.getByRole("link", { name: "Community" }).focus();
        await userEvent.keyboard("{ArrowDown}");
        expect(chevron("Community")).toHaveAttribute("aria-expanded", "true");
    });

    it("closes on Escape and hands focus back to the arrow", async () => {
        renderWithProviders(<NavMenus />);
        await userEvent.click(chevron("Events"));
        await screen.findByRole("link", { name: /All events/ });
        await userEvent.keyboard("{Escape}");
        expect(chevron("Events")).toHaveAttribute("aria-expanded", "false");
        expect(chevron("Events")).toHaveFocus();
    });

    it("opens on a mouse that rests, not one passing over", () => {
        vi.useFakeTimers();
        renderWithProviders(<NavMenus />);
        fireEvent.pointerEnter(item("Community"), { pointerType: "mouse" });
        expect(chevron("Community")).toHaveAttribute("aria-expanded", "false");
        act(() => vi.advanceTimersByTime(100));
        expect(chevron("Community")).toHaveAttribute("aria-expanded", "true");

        // Moving along the bar with one open swaps it at once.
        fireEvent.pointerEnter(item("Library"), { pointerType: "mouse" });
        expect(chevron("Library")).toHaveAttribute("aria-expanded", "true");
        expect(chevron("Community")).toHaveAttribute("aria-expanded", "false");
    });

    it("shuts a little after the mouse leaves, and stays for one coming back", () => {
        vi.useFakeTimers();
        renderWithProviders(<NavMenus />);
        const region = item("Library").closest("div.relative")!;
        fireEvent.pointerEnter(item("Library"), { pointerType: "mouse" });
        act(() => vi.advanceTimersByTime(100));

        fireEvent.pointerLeave(region, { pointerType: "mouse" });
        fireEvent.pointerEnter(item("Library"), { pointerType: "mouse" });
        act(() => vi.advanceTimersByTime(300));
        expect(chevron("Library")).toHaveAttribute("aria-expanded", "true");

        fireEvent.pointerLeave(region, { pointerType: "mouse" });
        act(() => vi.advanceTimersByTime(300));
        expect(chevron("Library")).toHaveAttribute("aria-expanded", "false");
    });

    it("leaves a touch to follow the link rather than open the menu", () => {
        vi.useFakeTimers();
        renderWithProviders(<NavMenus />);
        fireEvent.pointerEnter(item("Library"), { pointerType: "touch" });
        act(() => vi.advanceTimersByTime(300));
        expect(chevron("Library")).toHaveAttribute("aria-expanded", "false");
    });

    it("closes once a link in it is followed", async () => {
        renderWithProviders(<NavMenus />);
        await userEvent.click(chevron("Library"));
        await userEvent.click(
            await screen.findByRole("link", { name: "Upcoming games" })
        );
        expect(chevron("Library")).toHaveAttribute("aria-expanded", "false");
    });

    it("lists the trending threads", async () => {
        server.use(
            http.get(`${API}/community/trending`, () =>
                HttpResponse.json([
                    {
                        id: 7,
                        rank: 1,
                        title: "Best boss fight this year?",
                        subject: {
                            kind: "game",
                            game: {
                                id: 1,
                                title: "Elden Ring",
                                slug: "elden-ring",
                                coverUrl: null,
                                hasSexualContent: false,
                            },
                        },
                        author: null,
                        createdAt: "2026-11-10T00:00:00Z",
                        lastActivityAt: "2026-11-16T00:00:00Z",
                        messageCount: 12,
                        contributorCount: 4,
                        contributors: [],
                        recentMessageCount: 9,
                        activity: [],
                    },
                ])
            )
        );
        renderWithProviders(<NavMenus />);
        await userEvent.click(chevron("Community"));
        expect(
            await screen.findByRole("link", { name: /Best boss fight/ })
        ).toHaveAttribute("href", "/community/thread/7");
    });
});
