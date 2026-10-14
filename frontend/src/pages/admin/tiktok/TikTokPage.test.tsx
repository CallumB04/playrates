import { describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ToastStack from "../../../components/feedback/ToastStack";
import { renderWithProviders } from "../../../test/renderWithProviders";
import type { TikTokPostFile, TikTokPostRow } from "../lib/tiktokPosts";
import TikTokPage from "./TikTokPage";

// The real list changes every time a post goes up; the page's behaviour doesn't.
const { POSTS } = vi.hoisted(() => {
    const file = (title: string): TikTokPostFile => ({
        tiktok: {
            title,
            description: `${title} description #gaming`,
            song: { track: "Theme of Laura", artist: "Akira Yamaoka", why: "" },
            altSong: { track: "Little Dark Age", artist: "MGMT", why: "" },
            musicSearch: "",
            pinnedComment: `${title} comment`,
            when: "This week.",
        },
        games: Array.from({ length: 10 }),
    });
    const POSTS: TikTokPostRow[] = [
        {
            name: "horror",
            posted: true,
            date: "2026-10-14",
            url: "https://www.tiktok.com/@playratesapp/photo/1",
            listed: true,
            file: file("Horror"),
        },
        {
            name: "rpgs",
            posted: false,
            date: null,
            url: null,
            listed: true,
            file: file("RPGs"),
        },
        {
            name: "indie",
            posted: false,
            date: null,
            url: null,
            listed: false,
            file: file("Indie"),
        },
    ];
    return { POSTS };
});

vi.mock("./posts", () => ({ TIKTOK_POSTS: POSTS }));

const card = (title: string) =>
    screen.getByRole("heading", { name: title }).closest("li")!;

describe("TikTokPage", () => {
    it("says how many are posted and which is up next", () => {
        renderWithProviders(<TikTokPage />);
        expect(screen.getByText(/1 of 3 posted/)).toBeInTheDocument();
        expect(
            within(card("Horror")).getByText("Posted 2026-10-14")
        ).toBeInTheDocument();
        expect(within(card("RPGs")).getByText("Up next")).toBeInTheDocument();
        expect(
            within(card("Indie")).getByText("Not in POSTS.md")
        ).toBeInTheDocument();
    });

    it("counts each post's games", () => {
        renderWithProviders(<TikTokPage />);
        expect(within(card("RPGs")).getByText(/10 games/)).toBeInTheDocument();
    });

    it("links a posted one to TikTok and folds its details away", () => {
        renderWithProviders(<TikTokPage />);
        const posted = card("Horror");
        expect(
            within(posted).getByRole("link", { name: /view on tiktok/i })
        ).toHaveAttribute(
            "href",
            "https://www.tiktok.com/@playratesapp/photo/1"
        );
        expect(posted.querySelector("details")).not.toHaveAttribute("open");
        expect(card("RPGs").querySelector("details")).toHaveAttribute("open");
    });

    it("copies the description for pasting into TikTok", async () => {
        const user = userEvent.setup();
        renderWithProviders(
            <>
                <TikTokPage />
                <ToastStack />
            </>
        );
        await user.click(
            within(card("RPGs")).getByRole("button", {
                name: "Copy description",
            })
        );
        expect(await navigator.clipboard.readText()).toBe(
            "RPGs description #gaming"
        );
        expect(
            await screen.findByText("Description copied")
        ).toBeInTheDocument();
    });

    it("says so when the clipboard refuses", async () => {
        const user = userEvent.setup();
        vi.spyOn(navigator.clipboard, "writeText").mockRejectedValueOnce(
            new Error("denied")
        );
        renderWithProviders(
            <>
                <TikTokPage />
                <ToastStack />
            </>
        );
        await user.click(
            within(card("RPGs")).getByRole("button", { name: "Copy title" })
        );
        expect(
            await screen.findByText("Couldn't copy the title")
        ).toBeInTheDocument();
    });
});
