import { useAuth } from "../contexts/AuthContext";
import { useProgressQuery } from "./queries/useProgress";
import { setupSteps, type SetupStep } from "../lib/setupChecklist";

/** The signed-in account's setup steps, done or not; null signed out or
 *  while loading. Read off progress, which judges them and pays for them. */
export const useSetupSteps = (): SetupStep[] | null => {
    const { user } = useAuth();
    const { data } = useProgressQuery(!!user);
    if (!user) return null;
    return setupSteps(user.username, data?.setup.steps);
};
