import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useLocation } from "react-router-dom";
import { renderWithProviders } from "../test/renderWithProviders";
import { AccountFormProvider } from "./AccountFormProvider";
import { useAccountForm } from "./AccountFormContext";

const screenSize = vi.hoisted(() => ({ wide: true }));
vi.mock("../hooks/useMediaQuery", async (original) => ({
    ...(await original<typeof import("../hooks/useMediaQuery")>()),
    useMediaQuery: () => screenSize.wide,
}));

beforeEach(() => {
    screenSize.wide = true;
});

const Probe = () => {
    const { mode, openLogin, openReset, openSignup } = useAccountForm();
    const { pathname, state } = useLocation();
    return (
        <>
            <p data-testid="where">{pathname}</p>
            <p data-testid="mode">{mode ?? "closed"}</p>
            <p data-testid="state">{JSON.stringify(state)}</p>
            <button onClick={openLogin}>Sign in</button>
            <button onClick={openReset}>Reset</button>
            <button onClick={openSignup}>Join</button>
        </>
    );
};

const open = () =>
    renderWithProviders(
        <AccountFormProvider>
            <Probe />
        </AccountFormProvider>,
        { route: "/game/7" }
    );

describe("AccountFormProvider", () => {
    it("opens the log-in popup over the page on a wide screen", async () => {
        open();
        await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
        expect(screen.getByTestId("mode")).toHaveTextContent("login");
        expect(screen.getByTestId("where")).toHaveTextContent("/game/7");
    });

    it("takes a phone to the log-in page, remembering the way back", async () => {
        screenSize.wide = false;
        open();
        await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
        expect(screen.getByTestId("where")).toHaveTextContent("/login");
        expect(screen.getByTestId("mode")).toHaveTextContent("closed");
        expect(screen.getByTestId("state")).toHaveTextContent(
            '"from":"/game/7"'
        );
    });

    it("takes a phone asking for a new password to that step of the page", async () => {
        screenSize.wide = false;
        open();
        await userEvent.click(screen.getByRole("button", { name: "Reset" }));
        expect(screen.getByTestId("state")).toHaveTextContent('"step":"reset"');
    });

    it("sends signing up to its page at every width", async () => {
        open();
        await userEvent.click(screen.getByRole("button", { name: "Join" }));
        expect(screen.getByTestId("where")).toHaveTextContent("/join");
    });
});
