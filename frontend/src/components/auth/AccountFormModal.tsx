import { useState } from "react";
import { useAccountForm } from "../../contexts/AccountFormContext";
import Modal from "../ui/Modal";
import LoginForm from "./LoginForm";
import SignupForm from "./SignupForm";
import ForgotPasswordForm from "./ForgotPasswordForm";
import { BRAND_MOTTO, BRAND_NAME } from "../../constants/brand";

/** Switching mode unmounts one form and mounts the other, which clears the
 *  old fields and errors for free. */
const AccountFormModal = () => {
    const { mode, openLogin, openSignup, openReset, close } = useAccountForm();
    const [emailAfterSignup, setEmailAfterSignup] = useState("");
    const [emailForReset, setEmailForReset] = useState("");

    if (!mode) return null;

    const isSignup = mode === "signup";
    const isReset = mode === "reset";

    const handleSignedUp = (email: string) => {
        setEmailAfterSignup(email);
        openLogin();
    };

    return (
        <Modal
            onClose={close}
            labelledBy="account-form-title"
            className="w-full max-w-[440px] p-0! sm:p-0!"
        >
            <header className="relative overflow-hidden border-b border-subtle px-5 py-6 sm:px-6">
                <span
                    aria-hidden
                    className="pointer-events-none absolute -top-20 -right-16 size-56 rounded-full bg-brand/12 blur-3xl"
                />
                <div className="relative">
                    <p className="font-display text-xl font-bold text-content">
                        {BRAND_NAME}
                    </p>
                    <h2
                        id="account-form-title"
                        className="mt-3 font-display text-section text-content"
                    >
                        {isSignup
                            ? "Create your account"
                            : isReset
                              ? "Set a new password"
                              : "Welcome back"}
                    </h2>
                    <p className="mt-1 text-body-sm text-content-secondary">
                        {isSignup
                            ? `${BRAND_MOTTO}.`
                            : isReset
                              ? "We'll email you a link to choose one."
                              : "What's new on your backlog?"}
                    </p>
                </div>
            </header>

            <div className="px-5 py-6 sm:px-6">
                {isSignup ? (
                    <SignupForm onSignedUp={handleSignedUp} />
                ) : isReset ? (
                    <ForgotPasswordForm initialEmail={emailForReset} />
                ) : (
                    <LoginForm
                        initialEmail={emailAfterSignup}
                        onForgot={(email) => {
                            setEmailForReset(email);
                            openReset();
                        }}
                    />
                )}
            </div>

            <footer className="border-t border-subtle bg-surface-sunken/40 px-5 py-4 text-center text-body-sm text-content-secondary sm:px-6">
                {isSignup
                    ? "Already have an account?"
                    : isReset
                      ? "Remembered it?"
                      : "New here?"}{" "}
                <button
                    type="button"
                    onClick={isSignup || isReset ? openLogin : openSignup}
                    className="cursor-pointer font-medium text-brand lift hover:text-brand-hover"
                >
                    {isSignup || isReset ? "Log in" : "Create an account"}
                </button>
            </footer>
        </Modal>
    );
};

export default AccountFormModal;
