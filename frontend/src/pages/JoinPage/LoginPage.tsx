import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { usePageMeta } from "../../hooks/usePageMeta";
import LoginSteps from "../../components/auth/LoginSteps";
import SwitchLink from "./components/SwitchLink";
import { returnTo } from "./lib/returnTo";

/**
 * Logging in, on the sign-up page's own frame, so moving between the two
 * changes only the form. Sign in elsewhere opens the same steps in a
 * popup. Signed in, it goes back where you were.
 */
const LoginPage = () => {
    usePageMeta({ title: "Log in", noindex: true });
    const { session } = useAuth();
    const { state } = useLocation();

    if (session) return <Navigate to={returnTo(state)} replace />;

    return (
        <LoginSteps
            // Sent here for a new password link, from a phone.
            initialStep={
                (state as { step?: unknown } | null)?.step === "reset"
                    ? "reset"
                    : "login"
            }
            createAccount={
                <SwitchLink to="/join">Create an account</SwitchLink>
            }
        />
    );
};

export default LoginPage;
