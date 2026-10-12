import { useAuth } from "../contexts/AuthContext";
import { useMyGameLogIds } from "./queries/useGameLogs";
import { useMyFriends } from "./queries/useFriends";
import { setupSteps, type SetupStep } from "../lib/setupChecklist";

/** The signed-in account's setup steps, done or not; null signed out or
 *  while loading. Both lists are already cached for the rest of the app. */
export const useSetupSteps = (): SetupStep[] | null => {
    const { user } = useAuth();
    const { data: logs } = useMyGameLogIds();
    const { data: friends } = useMyFriends();
    if (!user) return null;
    return setupSteps({
        profile: user,
        logCount: logs?.length,
        friendCount: friends?.filter((edge) => edge.status === "friend").length,
    });
};
