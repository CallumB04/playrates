import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useNotify } from "../../contexts/NotificationContext";
import ProfileError from "./components/ProfileError";
import ProfilePage from "./ProfilePage";

/**
 * Guards the route param so ProfilePage gets a guaranteed username. Has to be
 * its own component — an early return inside ProfilePage would sit above its
 * hooks and change the hook count between renders.
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
