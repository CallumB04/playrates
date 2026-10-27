import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../test/msw/server";
import { buildProfile } from "../test/msw/handlers";
import { renderWithProviders } from "../test/renderWithProviders";
import SettingsPage from "./SettingsPage";

const user = buildProfile({ about: { pronouns: "he/him" } });

vi.mock("../contexts/AuthContext", () => ({
    useAuth: () => ({ user, signOut: vi.fn() }),
}));
vi.mock("../contexts/AccountFormContext", () => ({
    useAccountForm: () => ({ openLogin: vi.fn() }),
}));

const API = "http://localhost:3000/api/v1";
let patches: Record<string, unknown>[];

beforeEach(() => {
    patches = [];
    server.use(
        // The close-account panel's counts; nothing here reads them.
        http.get(`${API}/users/:username/stats`, () =>
            HttpResponse.json({ logCount: 0 })
        ),
        http.patch(`${API}/profiles/me`, async ({ request }) => {
            const body = (await request.json()) as Record<string, unknown>;
            patches.push(body);
            return HttpResponse.json({ ...user, ...body });
        })
    );
});

const openProfile = () =>
    renderWithProviders(<SettingsPage />, {
        route: "/settings?section=profile",
    });

describe("SettingsPage's About fields", () => {
    it("saves one as it's left, and only that one", async () => {
        openProfile();
        const u = userEvent.setup({ delay: null });

        const pronouns = screen.getByLabelText("Pronouns");
        await u.clear(pronouns);
        await u.type(pronouns, "they/them");
        await u.click(screen.getByLabelText("Location"));

        await waitFor(() =>
            expect(patches).toEqual([{ pronouns: "they/them" }])
        );
    });

    it("says what's wrong with one and doesn't send it", async () => {
        openProfile();
        const u = userEvent.setup({ delay: null });

        await u.type(screen.getByLabelText("Website"), "callum dot dev");
        await u.click(screen.getByLabelText("Location"));

        expect(
            await screen.findByText("Enter a full address, starting https://")
        ).toBeInTheDocument();
        expect(patches).toEqual([]);
    });
});
