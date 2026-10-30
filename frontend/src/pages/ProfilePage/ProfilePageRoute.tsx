import { useEffect } from "react";
import { Navigate, useLocation, useParams } from "react-router-dom";
import { useNotify } from "../../contexts/NotificationContext";
import NotFoundPage from "../NotFoundPage";
import { profilePath } from "../../lib/profilePaths";
import ProfileError from "./components/ProfileError";
import { isLegacyShelfSearch, parseProfileTab } from "./lib/profileViews";
import ProfilePage from "./ProfilePage";

/** Guards the route params so ProfilePage gets a guaranteed username and
 *  tab. Its own component, because an early return would change
 *  ProfilePage's hook count. */
const ProfilePageRoute = () => {
    const { targetUsername, view } = useParams();
    const { search } = useLocation();
    const notify = useNotify();

    useEffect(() => {
        if (!targetUsername)
            notify("That link doesn't go to a profile", "error");
    }, [targetUsername, notify]);

    if (!targetUsername) return <ProfileError />;

    const tab = parseProfileTab(view);
    if (!tab) return <NotFoundPage />;

    if (tab === "profile" && isLegacyShelfSearch(search)) {
        return (
            <Navigate
                to={{ pathname: profilePath(targetUsername, "games"), search }}
                replace
            />
        );
    }

    /* Keyed by the user alone: landing on another profile is a fresh page
       rather than the same one with the previous user's modal still open,
       but moving between one profile's views keeps what it has loaded. */
    return (
        <ProfilePage key={targetUsername} username={targetUsername} tab={tab} />
    );
};

export default ProfilePageRoute;
