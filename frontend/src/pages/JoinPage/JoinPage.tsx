import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useAccountForm } from "../../contexts/AccountFormContext";
import { usePageMeta } from "../../hooks/usePageMeta";
import SignupForm from "../../components/auth/SignupForm";
import CheckInbox from "../../components/auth/CheckInbox";
import JoinShell from "./components/JoinShell";
import StepHeading from "./components/StepHeading";
import { returnTo } from "./lib/returnTo";

/**
 * Signing up, on a page of its own: the form, then the inbox to confirm it
 * from. Signed in already, there's nothing here, so it goes back.
 */
const JoinPage = () => {
    usePageMeta({ title: "Create your account", noindex: true });
    const { session } = useAuth();
    const { openLogin } = useAccountForm();
    const navigate = useNavigate();
    const { state } = useLocation();
    const [sentTo, setSentTo] = useState<string | null>(null);
    const back = returnTo(state);

    if (session && !sentTo) return <Navigate to={back} replace />;

    return (
        <JoinShell>
            {sentTo ? (
                <div className="flex flex-1 flex-col justify-center">
                    <StepHeading title="Check your inbox" centred />
                    <div className="mt-6">
                        <CheckInbox
                            email={sentTo}
                            justSent
                            onStartAgain={() => setSentTo(null)}
                        />
                    </div>
                </div>
            ) : (
                <>
                    <StepHeading
                        title="Create your account"
                        aside={
                            <>
                                Already have an account?{" "}
                                <button
                                    type="button"
                                    onClick={openLogin}
                                    className="relative cursor-pointer font-medium text-brand-text before:absolute before:-inset-x-1 before:-inset-y-3 before:content-[''] hover:underline"
                                >
                                    Log in
                                </button>
                            </>
                        }
                    />
                    <div className="mt-6">
                        <SignupForm
                            // Signed straight in, back to where they were;
                            // otherwise the link to confirm is on its way.
                            onSignedUp={(email, signedIn) =>
                                signedIn
                                    ? navigate(back, { replace: true })
                                    : setSentTo(email)
                            }
                        />
                    </div>
                </>
            )}
        </JoinShell>
    );
};

export default JoinPage;
