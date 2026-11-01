import { Navigate, useLocation, useParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import SignUpPlate from "../../components/SignUpPlate";
import { profilePath } from "../../lib/profilePaths";

/**
 * /me, and anything under it: the same place on whoever follows it's own
 * profile. /me/lists is your lists, /me/gaming-25 your grid. For links
 * written for everyone, like patch notes, which can't name a profile.
 */
const MyProfile = () => {
    const { user, isLoading } = useAuth();
    const { "*": rest } = useParams();
    const { search, hash } = useLocation();

    if (isLoading) return null;
    if (user) {
        const path = rest
            ? `${profilePath(user.username)}/${rest}`
            : profilePath(user.username);
        return <Navigate to={{ pathname: path, search, hash }} replace />;
    }

    // Signing in from here lands on it: the page re-renders with a user.
    return rest?.startsWith("gaming-25") ? (
        <SignUpPlate
            title="Sign up to make your Gaming 25"
            body="Pick one game for each of 25 categories."
        />
    ) : (
        <SignUpPlate
            title="Sign up to get your own profile"
            body="This link goes to your profile. Sign in and it takes you there."
        />
    );
};

export default MyProfile;
