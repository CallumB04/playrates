import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { buildProfile } from "../../../test/msw/handlers";
import { renderWithProviders } from "../../../test/renderWithProviders";
import ShareCardButton from "./ShareCardButton";

const auth = vi.hoisted(() => ({ user: null as unknown }));
vi.mock("../../../contexts/AuthContext", () => ({ useAuth: () => auth }));
auth.user = buildProfile({ username: "bee" });

describe("ShareCardButton", () => {
    it("shares the Player card, with a link that still counts as an invite", async () => {
        renderWithProviders(<ShareCardButton username="bee" />);
        await userEvent.click(
            screen.getByRole("button", { name: "Share your Player card" })
        );

        expect(
            await screen.findByRole("dialog", { name: "Your Player card" })
        ).toBeInTheDocument();
        expect(screen.getByText(/\/user\/bee\?ref=bee$/)).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "Download" })
        ).toBeInTheDocument();
    });
});
