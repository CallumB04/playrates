import { useEffect, useState } from "react";
import { ApiError } from "../../../api";
import { useAuth } from "../../../contexts/AuthContext";
import { useNotify } from "../../../contexts/NotificationContext";
import {
    useProgressQuery,
    useSetStyle,
} from "../../../hooks/queries/useProgress";

/** Your pinned reviews, and pinning another or taking one off, up to the
 *  slots you have. Shows a change at once, before the save lands. */
export const usePinReviews = () => {
    const { user } = useAuth();
    const { data } = useProgressQuery(!!user);
    const setStyle = useSetStyle();
    const notify = useNotify();
    const [pinned, setPinned] = useState<number[]>(user?.pinnedReviews ?? []);
    // The saved pins, when the profile comes back with them.
    useEffect(
        () => setPinned(user?.pinnedReviews ?? []),
        [user?.pinnedReviews]
    );
    const slots = data?.look.pinnedReviewSlots ?? 0;

    const save = (next: number[], onDone?: () => void) => {
        const was = pinned;
        setPinned(next);
        setStyle.mutate(
            { pinnedReviews: next },
            {
                onSuccess: onDone,
                onError: (error) => {
                    setPinned(was);
                    notify(
                        error instanceof ApiError
                            ? error.message
                            : "Couldn't save your pins",
                        "error"
                    );
                },
            }
        );
    };

    const toggle = (id: number) => {
        const next = pinned.includes(id)
            ? pinned.filter((p) => p !== id)
            : [...pinned, id];
        if (next.length > slots) {
            notify(`You can pin ${slots}. More slots are in the shop.`, "info");
            return;
        }
        save(next);
    };

    return { slots, pinned, toggle, save, saving: setStyle.isPending };
};
