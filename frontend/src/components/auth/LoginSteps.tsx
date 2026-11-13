import { useState, type ReactNode } from "react";
import LoginForm from "./LoginForm";
import ForgotPasswordForm from "./ForgotPasswordForm";
import CheckInbox from "./CheckInbox";
import StepHeading from "./StepHeading";

type Step =
    { kind: "login" } | { kind: "reset" } | { kind: "inbox"; email: string };

/** Back to the log-in form, from the steps off it. */
const BackToLogIn = ({ onClick }: { onClick: () => void }) => (
    <button
        type="button"
        onClick={onClick}
        className="relative cursor-pointer font-medium text-brand-text before:absolute before:-inset-x-1 before:-inset-y-3 before:content-[''] hover:underline"
    >
        Log in
    </button>
);

/**
 * Logging in, step by step: the form, a forgotten password, and an email
 * still to be confirmed. The same on the /login page and in the popup, so
 * the two are one log-in in two sizes.
 */
const LoginSteps = ({
    initialStep = "login",
    createAccount,
    headingAs = "h1",
    headingId,
}: {
    initialStep?: "login" | "reset";
    /** The way across to signing up, as where it's shown needs it. */
    createAccount: ReactNode;
    headingAs?: "h1" | "h2";
    /** For a dialog that names itself by its heading. */
    headingId?: string;
}) => {
    const [step, setStep] = useState<Step>({ kind: initialStep });
    const [email, setEmail] = useState("");
    const toLogIn = () => setStep({ kind: "login" });
    const heading = { as: headingAs, id: headingId };

    if (step.kind === "inbox") {
        return (
            <div>
                <StepHeading title="Check your inbox" centred {...heading} />
                <div className="mt-6">
                    <CheckInbox
                        email={step.email}
                        justSent={false}
                        onStartAgain={toLogIn}
                    />
                </div>
                <p className="mt-6 text-center text-body-sm text-content-secondary">
                    Confirmed it? <BackToLogIn onClick={toLogIn} />
                </p>
            </div>
        );
    }

    if (step.kind === "reset") {
        return (
            <div>
                <StepHeading
                    title="Set a new password"
                    aside={
                        <>
                            Remembered it? <BackToLogIn onClick={toLogIn} />
                        </>
                    }
                    {...heading}
                />
                <div className="mt-6">
                    <ForgotPasswordForm initialEmail={email} />
                </div>
            </div>
        );
    }

    return (
        <div>
            <StepHeading
                title="Welcome back"
                aside={<>New here? {createAccount}</>}
                {...heading}
            />
            <div className="mt-6">
                <LoginForm
                    initialEmail={email}
                    onUnconfirmed={(address) =>
                        setStep({ kind: "inbox", email: address })
                    }
                    onForgot={(address) => {
                        setEmail(address);
                        setStep({ kind: "reset" });
                    }}
                />
            </div>
        </div>
    );
};

export default LoginSteps;
