import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useNotify } from "../../contexts/NotificationContext";
import ProfileError from "./components/ProfileError";
import ProfilePage from "./ProfilePage";

/**
 * Guards the route parameter so ProfilePage can take a guaranteed username.
 *
 * This split is the fix for the rules-of-hooks violation: the old component
 * returned <ProfileError /> early when the username was missing, but did so
 * *above* six useQuery calls and roughly fifteen other hooks — so the hook
 * count changed between renders and React would throw on navigation.
 */
const ProfilePageRoute = () => {
    const { targetUsername } = useParams();
    const notify = useNotify();

    useEffect(() => {
        if (!targetUsername) notify("No user found in URL", "error");
    }, [targetUsername, notify]);

    if (!targetUsername) return <ProfileError />;

    return <ProfilePage username={targetUsername} />;
};

export default ProfilePageRoute;
