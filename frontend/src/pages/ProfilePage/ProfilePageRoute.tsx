import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useNotify } from "../../contexts/NotificationContext";
import ProfileError from "./components/ProfileError";
import ProfilePage from "./ProfilePage";

/** Guards the route param so ProfilePage gets a guaranteed username. Its own
 *  component, because an early return would change ProfilePage's hook count. */
const ProfilePageRoute = () => {
    const { targetUsername } = useParams();
    const notify = useNotify();

    useEffect(() => {
        if (!targetUsername) notify("No user found in URL", "error");
    }, [targetUsername, notify]);

    if (!targetUsername) return <ProfileError />;

    /* Keyed, so landing on another profile is a fresh page rather than the
       same one with the previous user's modal still open over it. */
    return <ProfilePage key={targetUsername} username={targetUsername} />;
};

export default ProfilePageRoute;
