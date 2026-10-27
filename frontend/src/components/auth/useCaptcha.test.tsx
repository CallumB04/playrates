import { forwardRef, useImperativeHandle } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthError } from "@supabase/supabase-js";
import { renderWithProviders } from "../../test/renderWithProviders";
import LoginForm from "./LoginForm";

const signIn =
    vi.fn<(email: string, password: string, token?: string) => Promise<void>>();
const resetWidget = vi.fn();

vi.mock("../../contexts/AuthContext", () => ({
    useAuth: () => ({ signIn, signInWithProvider: vi.fn() }),
}));

vi.mock("../../contexts/AccountFormContext", () => ({
    useAccountForm: () => ({ close: vi.fn() }),
}));

vi.mock("../../lib/env", async (importOriginal) => {
    const actual = await importOriginal<typeof import("../../lib/env")>();
    return { env: { ...actual.env, turnstileSiteKey: "test-site-key" } };
});

/* Stands in for Cloudflare's widget: the real one loads a remote script. */
vi.mock("@marsidev/react-turnstile", () => {
    const Turnstile = forwardRef<
        { reset: () => void },
        { onSuccess: (token: string) => void; onError: () => void }
    >(({ onSuccess, onError }, ref) => {
        useImperativeHandle(ref, () => ({ reset: resetWidget }));
        return (
            <>
                <button type="button" onClick={() => onSuccess("token-1")}>
                    pass the check
                </button>
                <button type="button" onClick={() => onError()}>
                    break the check
                </button>
            </>
        );
    });
    Turnstile.displayName = "FakeTurnstile";
    return { Turnstile };
});

beforeEach(() => {
    signIn.mockReset();
    resetWidget.mockClear();
});

const fillAndSubmit = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.type(screen.getByLabelText("Email"), "a@b.co");
    await user.type(screen.getByLabelText("Password"), "hunter2hunter2");
    await user.click(screen.getByRole("button", { name: "Log in" }));
};

describe("the bot check on the email forms", () => {
    it("holds the request until the check has passed", async () => {
        const user = userEvent.setup();
        renderWithProviders(<LoginForm />);

        await fillAndSubmit(user);

        expect(signIn).not.toHaveBeenCalled();
        expect(screen.getByRole("alert")).toHaveTextContent(
            /Still checking you're not a bot/
        );
    });

    it("sends the token with the request", async () => {
        const user = userEvent.setup();
        renderWithProviders(<LoginForm />);

        await user.click(
            screen.getByRole("button", { name: "pass the check" })
        );
        await fillAndSubmit(user);

        expect(signIn).toHaveBeenCalledWith(
            "a@b.co",
            "hunter2hunter2",
            "token-1"
        );
    });

    it("says so when the widget couldn't load", async () => {
        const user = userEvent.setup();
        renderWithProviders(<LoginForm />);

        await user.click(
            screen.getByRole("button", { name: "break the check" })
        );
        await fillAndSubmit(user);

        expect(screen.getByRole("alert")).toHaveTextContent(
            /didn't load. Refresh the page/
        );
    });

    /* Not "those login details are not correct": they may well be. */
    it("blames the check, not the password, when Supabase turns it down", async () => {
        signIn.mockRejectedValue(
            new AuthError(
                "captcha protection: request disallowed",
                400,
                "captcha_failed"
            )
        );
        const user = userEvent.setup();
        renderWithProviders(<LoginForm />);

        await user.click(
            screen.getByRole("button", { name: "pass the check" })
        );
        await fillAndSubmit(user);

        expect(await screen.findByRole("alert")).toHaveTextContent(
            /bot check didn't pass/
        );
        expect(
            screen.queryByText("Those login details are not correct.")
        ).not.toBeInTheDocument();
    });

    /* A token is single use; a retry with the same one is refused. */
    it("asks for a fresh token after every attempt", async () => {
        signIn.mockRejectedValue(
            new AuthError("Invalid login", 400, "invalid_credentials")
        );
        const user = userEvent.setup();
        renderWithProviders(<LoginForm />);

        await user.click(
            screen.getByRole("button", { name: "pass the check" })
        );
        await fillAndSubmit(user);

        expect(resetWidget).toHaveBeenCalledOnce();
        expect(
            await screen.findByText("Those login details are not correct.")
        ).toBeVisible();
    });
});
