import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";
import { buildProfile } from "../../test/msw/handlers";
import AdminGate from "./AdminGate";

const auth = vi.hoisted(() => ({
    value: { user: null as unknown, isLoading: false },
}));

vi.mock("../../contexts/AuthContext", () => ({
    useAuth: () => auth.value,
}));

vi.mock("./AdminApp", () => ({
    default: () => <p>the dashboard</p>,
}));

describe("AdminGate", () => {
    it("shows a signed-out visitor the not-found page", () => {
        auth.value = { user: null, isLoading: false };
        renderWithProviders(<AdminGate />);
        expect(screen.getByText("404")).toBeInTheDocument();
        expect(screen.queryByText("the dashboard")).not.toBeInTheDocument();
    });

    it("shows a signed-in user who is not the admin the same page", () => {
        auth.value = { user: buildProfile({ isAdmin: false }), isLoading: false };
        renderWithProviders(<AdminGate />);
        expect(screen.getByText("404")).toBeInTheDocument();
        expect(screen.queryByText("the dashboard")).not.toBeInTheDocument();
    });

    it("loads the dashboard for the admin", async () => {
        auth.value = { user: buildProfile({ isAdmin: true }), isLoading: false };
        renderWithProviders(<AdminGate />);
        expect(await screen.findByText("the dashboard")).toBeInTheDocument();
    });
});
