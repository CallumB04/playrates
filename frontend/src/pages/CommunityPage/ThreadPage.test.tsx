import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { http, HttpResponse } from "msw";
import type { ThreadDetail } from "@playrates/shared";
import { server } from "../../test/msw/server";
import { renderWithProviders } from "../../test/renderWithProviders";
import ThreadPage from "./ThreadPage";

vi.mock("../../contexts/AuthContext", () => ({
    useAuth: () => ({ user: null }),
}));
vi.mock("../../contexts/AccountFormContext", () => ({
    useAccountForm: () => ({ openSignup: vi.fn(), openLogin: vi.fn() }),
}));

const API = "http://localhost:3000/api/v1";

const detail: ThreadDetail = {
    thread: {
        id: 5,
        title: "Best boss?",
        subject: {
            kind: "game",
            game: {
                id: 1,
                title: "Elden Ring",
                slug: "elden-ring",
                coverUrl: null,
                artworkUrl: "https://example.test/elden-art.jpg",
                hasSexualContent: false,
            },
        },
        author: null,
        createdAt: "2026-11-01T00:00:00.000Z",
        lastActivityAt: "2026-11-12T00:00:00.000Z",
        messageCount: 1,
        contributorCount: 1,
        contributors: [],
        recentMessageCount: 0,
    },
    messages: [],
    canPost: true,
    canDeleteThread: false,
};

const land = () => {
    server.use(
        http.get(`${API}/community/threads/5`, () => HttpResponse.json(detail))
    );
    renderWithProviders(
        <Routes>
            <Route
                path="/community/thread/:threadId"
                element={<ThreadPage />}
            />
        </Routes>,
        { route: "/community/thread/5" }
    );
};

/** The backdrop is portalled into the body, behind the page. */
const art = () =>
    document.body.querySelector<HTMLImageElement>('img[src*="elden-art"]');

describe("ThreadPage", () => {
    it("puts the game's art behind a thread about it, as its page does", async () => {
        land();
        await screen.findByRole("heading", { name: "Best boss?" });
        expect(art()).not.toBeNull();
    });
});
