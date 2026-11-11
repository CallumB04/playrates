import { useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { usePageMeta } from "../../hooks/usePageMeta";
import LoginForm from "../../components/auth/LoginForm";
import ForgotPasswordForm from "../../components/auth/ForgotPasswordForm";
import CheckInbox from "../../components/auth/CheckInbox";
import StepHeading from "./components/StepHeading";
import SwitchLink from "./components/SwitchLink";
import { returnTo } from "./lib/returnTo";

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

const Aside = ({ children }: { children: ReactNode }) => (
    <p className="mt-6 text-center text-body-sm text-content-secondary">
        {children}
    </p>
);

/**
 * Logging in, on the sign-up page's own frame, so moving between the two
 * changes only the form. Elsewhere on the site, Sign in is still the modal
 * over whatever you were reading. Signed in, it goes back where you were.
 */
const LoginPage = () => {
    usePageMeta({ title: "Log in", noindex: true });
    const { session } = useAuth();
    const { state } = useLocation();
    const [step, setStep] = useState<Step>({ kind: "login" });
    const [email, setEmail] = useState("");

    if (session) return <Navigate to={returnTo(state)} replace />;

    const toLogIn = () => setStep({ kind: "login" });

    if (step.kind === "inbox") {
        return (
            <div>
                <StepHeading title="Check your inbox" centred />
                <div className="mt-6">
                    <CheckInbox
                        email={step.email}
                        justSent={false}
                        onStartAgain={toLogIn}
                    />
                </div>
                <Aside>
                    Confirmed it? <BackToLogIn onClick={toLogIn} />
                </Aside>
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
                aside={
                    <>
                        New here?{" "}
                        <SwitchLink to="/join">Create an account</SwitchLink>
                    </>
                }
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

export default LoginPage;
