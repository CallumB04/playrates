import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { usePageMeta } from "../../hooks/usePageMeta";
import SignupForm from "../../components/auth/SignupForm";
import CheckInbox from "../../components/auth/CheckInbox";
import SwitchLink from "./components/SwitchLink";
import StepHeading from "../../components/auth/StepHeading";
import { returnTo } from "./lib/returnTo";
import { BREAKPOINT, useMediaQuery } from "../../hooks/useMediaQuery";

/**
 * Signing up, on a page of its own: the form, then the inbox to confirm it
 * from. Signed in already, there's nothing here, so it goes back.
 */
const JoinPage = () => {
    usePageMeta({ title: "Create your account", noindex: true });
    const { session } = useAuth();
    const navigate = useNavigate();
    const { state } = useLocation();
    const [sentTo, setSentTo] = useState<string | null>(null);
    const wide = useMediaQuery(BREAKPOINT.md);
    const back = returnTo(state);

    if (session && !sentTo) return <Navigate to={back} replace />;

    return (
        <>
            {sentTo ? (
                <div>
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
                                <SwitchLink to="/login">Log in</SwitchLink>
                            </>
                        }
                    />
                    <div className="mt-6">
                        <SignupForm
                            // A phone's keyboard would cover the page the
                            // moment it opened; there, it waits for a tap.
                            autoFocus={wide}
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
        </>
    );
};

export default JoinPage;
