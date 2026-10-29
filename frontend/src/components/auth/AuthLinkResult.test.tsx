import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { buildProfile } from "../../test/msw/handlers";
import { renderWithProviders } from "../../test/renderWithProviders";
import ToastStack from "../feedback/ToastStack";
import AuthLinkResult from "./AuthLinkResult";

const auth = vi.hoisted(() => ({ user: null as unknown }));
vi.mock("../../contexts/AuthContext", () => ({ useAuth: () => auth }));

beforeEach(() => {
    auth.user = null;
});

const land = (route: string) =>
    renderWithProviders(
        <>
            <AuthLinkResult />
            <ToastStack />
        </>,
        { route }
    );

describe("AuthLinkResult", () => {
    it("says the email is confirmed once the member is signed in", async () => {
        auth.user = buildProfile();
        land("/?confirmed=1");
        expect(
            await screen.findByText("Email confirmed. Welcome to PlayRates")
        ).toBeInTheDocument();
    });

    it("says nothing until the sign-in has landed", () => {
        land("/?confirmed=1");
        expect(screen.queryByText(/Email confirmed/)).toBeNull();
    });

    it("says a used or old link ran out", async () => {
        land("/#error=access_denied&error_code=otp_expired");
        expect(
            await screen.findByText(/That link has run out/)
        ).toBeInTheDocument();
    });
});
