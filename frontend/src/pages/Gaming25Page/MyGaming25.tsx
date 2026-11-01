import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useAccountForm } from "../../contexts/AccountFormContext";
import Button from "../../components/ui/Button";
import EmptyPlate from "../../components/ui/EmptyPlate";
import { gaming25Path } from "../../lib/profilePaths";

/**
 * /gaming-25: whoever follows it lands on their own grid. A grid lives under
 * its owner's name, so a link written for everyone (in patch notes, say)
 * can't name one.
 */
const MyGaming25 = () => {
    const { user, isLoading } = useAuth();
    const { openSignup, openLogin } = useAccountForm();

    if (isLoading) return null;
    if (user) return <Navigate to={gaming25Path(user.username)} replace />;

    return (
        <EmptyPlate
            title="Sign up to make your Gaming 25"
            body="Pick one game for each of 25 categories."
            action={
                <div className="flex flex-wrap justify-center gap-2">
                    <Button onClick={openSignup}>Sign up</Button>
                    <Button variant="secondary" onClick={openLogin}>
                        Sign in
                    </Button>
                </div>
            }
        />
    );
};

export default MyGaming25;
