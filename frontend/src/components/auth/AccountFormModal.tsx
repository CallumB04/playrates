import { useState } from "react";
import { useAccountForm } from "../../contexts/AccountFormContext";
import Modal from "../ui/Modal";
import LoginForm from "./LoginForm";
import SignupForm from "./SignupForm";

/**
 * Was a single 374-line component handling both modes with six refs and
 * imperative classList mutations. Splitting the two forms means switching
 * mode unmounts one and mounts the other, which is the reset the old code
 * needed a dedicated effect to perform.
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
            className="mx-auto flex w-full max-w-[630px] flex-col justify-center px-2 py-12 font-lexend text-content sm:px-12 sm:py-16 md:px-16"
        >
            <div className="text-center">
                <h2 id="account-form-title" className="text-3xl sm:text-4xl">
                    {isSignup ? "Sign up for PlayRates" : "Log in to PlayRates"}
                </h2>
                <p className="mt-2 sm:text-lg">
                    {isSignup ? "Create a free account or" : "Not a member?"}{" "}
                    <button
                        type="button"
                        onClick={isSignup ? openLogin : openSignup}
                        className="hover-text-purple"
                    >
                        {isSignup ? "log in" : "Sign up"}
                    </button>
                </p>
            </div>

            {isSignup ? (
                <SignupForm onSignedUp={handleSignedUp} />
            ) : (
                <LoginForm initialEmail={emailAfterSignup} />
            )}
        </Modal>
    );
};

export default AccountFormModal;
