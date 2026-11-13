import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { useLocation } from "react-router-dom";
import { renderWithProviders } from "../../test/renderWithProviders";
import AuthLinkResult from "./AuthLinkResult";

const auth = vi.hoisted(() => ({
    session: null as unknown,
    isLoading: false,
}));
vi.mock("../../contexts/AuthContext", () => ({ useAuth: () => auth }));

beforeEach(() => {
    auth.session = null;
    auth.isLoading = false;
});

const Where = () => {
    const { pathname, search } = useLocation();
    return <p data-testid="where">{`${pathname}${search}`}</p>;
};

const land = (route: string) =>
    renderWithProviders(
        <>
            <AuthLinkResult />
            <Where />
        </>,
        { route }
    );

const where = () => screen.getByTestId("where").textContent;

describe("AuthLinkResult", () => {
    it("takes a confirmed link to the page that welcomes you", async () => {
        auth.session = {};
        land("/?confirmed=1");
        await vi.waitFor(() => expect(where()).toBe("/join/confirmed"));
    });

    // Supabase reads the link's code from the address; leaving sooner loses it.
    it("waits for the sign-in to settle before leaving", () => {
        auth.isLoading = true;
        land("/?confirmed=1");
        expect(where()).toBe("/?confirmed=1");
    });

    it("says the link failed when it signed nobody in", async () => {
        land("/?confirmed=1");
        await vi.waitFor(() =>
            expect(where()).toBe("/join/confirmed?link=failed")
        );
    });

    it("says a used or old link ran out", async () => {
        land("/#error=access_denied&error_code=otp_expired");
        await vi.waitFor(() =>
            expect(where()).toBe("/join/confirmed?link=expired")
        );
    });

    it("leaves an ordinary page alone", () => {
        land("/library");
        expect(where()).toBe("/library");
    });
});
