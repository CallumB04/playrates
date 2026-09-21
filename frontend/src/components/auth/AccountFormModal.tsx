import { useState } from "react";
import { useAccountForm } from "../../contexts/AccountFormContext";
import Modal from "../ui/Modal";
import LoginForm from "./LoginForm";
import SignupForm from "./SignupForm";
import { BRAND_MOTTO, BRAND_NAME } from "../../constants/brand";

/**
 * Switching mode unmounts one form and mounts the other, which clears the
 * previous fields and errors without needing to reset anything by hand.
 */
const AccountFormModal = () => {
    const { mode, openLogin, openSignup, close } = useAccountForm();
    const [emailAfterSignup, setEmailAfterSignup] = useState("");

    if (!mode) return null;

    const isSignup = mode === "signup";

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
            <header className="relative overflow-hidden border-b border-subtle px-6 py-6">
                <span
                    aria-hidden
                    className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-brand/12 blur-3xl"
                />
                <div className="relative">
                    <p className="font-display text-xl font-bold text-content">
                        {BRAND_NAME}
                    </p>
                    <h2
                        id="account-form-title"
                        className="mt-3 font-display text-section text-content"
                    >
                        {isSignup ? "Create your account" : "Welcome back"}
                    </h2>
                    <p className="mt-1 text-body-sm text-content-secondary">
                        {isSignup ? BRAND_MOTTO : "Log in to pick up where you left off."}
                    </p>
                </div>
            </header>

            <div className="px-6 py-6">
                {isSignup ? (
                    <SignupForm onSignedUp={handleSignedUp} />
                ) : (
                    <LoginForm initialEmail={emailAfterSignup} />
                )}
            </div>

            <footer className="border-t border-subtle bg-surface-sunken/40 px-6 py-4 text-center text-body-sm text-content-secondary">
                {isSignup ? "Already have an account?" : "New here?"}{" "}
                <button
                    type="button"
                    onClick={isSignup ? openLogin : openSignup}
                    className="lift cursor-pointer font-medium text-brand hover:text-brand-hover"
                >
                    {isSignup ? "Log in" : "Create an account"}
                </button>
            </footer>
        </Modal>
    );
};

export default AccountFormModal;
