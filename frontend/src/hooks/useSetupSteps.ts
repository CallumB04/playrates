import { useAuth } from "../contexts/AuthContext";
import { useMyGameLogIds } from "./queries/useGameLogs";
import { useMyFriends } from "./queries/useFriends";
import { pendingSetup, type SetupStep } from "../lib/setupChecklist";

/** The signed-in account's setup steps, or null once there is nothing left
 *  to show. Both lists are already cached for the rest of the app. */
export const useSetupSteps = (): SetupStep[] | null => {
    const { user } = useAuth();
    const { data: logs } = useMyGameLogIds();
    const { data: friends } = useMyFriends();
    if (!user) return null;
    return pendingSetup({
        profile: user,
        logCount: logs?.length,
        friendCount: friends?.filter((edge) => edge.status === "friend").length,
    });
};
