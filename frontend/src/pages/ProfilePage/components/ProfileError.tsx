import { buttonClass } from "../../../components/ui/Button";
import { Link } from "react-router-dom";
import { useUser } from "../../../contexts/AuthContext";

// No username in the URL, or the profile fetch failed.
const ProfileError = () => {
    const user = useUser();

    return (
        <div className="absolute top-0 left-0 flex h-[calc(100vh-64px)] w-screen items-center justify-center px-4">
            <div className="flex h-full w-full flex-col items-center justify-center gap-y-5 px-4">
                <h1 className="text-center font-display text-xl text-content">
                    There was an error when fetching this user.
                </h1>
                <div className="flex w-full flex-col items-center gap-3 sm:w-max sm:flex-row">
                    <Link
                        to="/"
                        className={buttonClass("primary", "w-full sm:w-max")}
                    >
                        Return to home
                    </Link>
                    {user ? (
                        <Link
                            to={`/user/${user.username}`}
                            className={buttonClass(
                                "secondary",
                                "w-full sm:w-max"
                            )}
                        >
                            Go to my Profile
                        </Link>
                    ) : (
                        <></>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfileError;
