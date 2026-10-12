import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

/** Home, not wherever you were: signing out on a settings page or somebody's
 *  profile leaves you looking at something you can no longer load. */
export const useSignOut = () => {
    const { signOut } = useAuth();
    const navigate = useNavigate();
    return () => {
        void signOut();
        navigate("/");
    };
};
