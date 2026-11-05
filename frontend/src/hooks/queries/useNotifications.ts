import { useQuery } from "@tanstack/react-query";
import { fetchNotifications, queryKeys } from "../../api";
import { useAuth } from "../../contexts/AuthContext";

/** As many as the menu shows at once. Paging can come with a full page.
 *  Read and cleared ones expire after two months, so it rarely fills. */
const MENU_LIMIT = 30;

/** The inbox query is mounted for as long as the bell is, so its unread count
 *  is what the badge reads. Polled, because a friend request arrives without
 *  anything on this tab happening. */
export const useNotifications = (archived: boolean, enabled = true) => {
    const { user } = useAuth();
    return useQuery({
        queryKey: queryKeys.notifications.list(archived),
        queryFn: () => fetchNotifications(archived, MENU_LIMIT),
        enabled: !!user && enabled,
        staleTime: 30_000,
        refetchInterval: 60_000,
    });
};
