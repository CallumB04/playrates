import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import SignUpPlate from "../../components/SignUpPlate";
import { gaming25Path } from "../../lib/profilePaths";

/**
 * /gaming-25: whoever follows it lands on their own grid. A grid lives under
 * its owner's name, so a link written for everyone (in patch notes, say)
 * can't name one.
 */
const MyGaming25 = () => {
    const { user, isLoading } = useAuth();

    if (isLoading) return null;
    if (user) return <Navigate to={gaming25Path(user.username)} replace />;

    return (
        <SignUpPlate
            title="Sign up to make your Gaming 25"
            body="Pick one game for each of 25 categories."
        />
    );
};

export default MyGaming25;
