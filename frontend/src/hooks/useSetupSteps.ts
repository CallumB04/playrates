import { useAuth } from "../contexts/AuthContext";
import { useMyGameLogIds } from "./queries/useGameLogs";
import { useMyFriends } from "./queries/useFriends";
import { useUserReviews } from "./queries/useReviews";
import { useThreads } from "./queries/useCommunity";
import { setupSteps, type SetupStep } from "../lib/setupChecklist";

/** The signed-in account's setup steps, done or not; null signed out or
 *  while loading. Each count is the same query the profile page makes, so
 *  the two share a cache and stay in step. */
export const useSetupSteps = (): SetupStep[] | null => {
    const { user } = useAuth();
    const username = user?.username;
    const { data: logs } = useMyGameLogIds();
    const { data: friends } = useMyFriends();
    const { data: reviews } = useUserReviews(username);
    // A count is all that is wanted, so one row of it.
    const { data: threads } = useThreads(
        { participant: username, limit: 1 },
        !!username
    );
    if (!user) return null;
    return setupSteps({
        profile: user,
        logCount: logs?.length,
        reviewCount: reviews?.meta.total,
        friendCount: friends?.filter((edge) => edge.status === "friend").length,
        postCount: threads?.meta.total,
    });
};
