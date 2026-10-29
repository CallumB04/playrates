import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "../../../api";
import { useAuth } from "../../../contexts/AuthContext";
import { useNotify } from "../../../contexts/NotificationContext";
import {
    useProgressQuery,
    useSetStyle,
} from "../../../hooks/queries/useProgress";

const PINS = {
    pinnedReviews: { slots: "pinnedReviewSlots", item: "slot_pinned_review" },
    pinnedLists: { slots: "pinnedListSlots", item: "slot_pinned_list" },
} as const;

/** Your pinned reviews or lists, and pinning another or taking one off, up
 *  to the slots you have. Shows a change at once, before the save lands. */
export const usePins = (field: keyof typeof PINS) => {
    const { user } = useAuth();
    const { data } = useProgressQuery(!!user);
    const setStyle = useSetStyle();
    const notify = useNotify();
    const navigate = useNavigate();
    const [pinned, setPinned] = useState<number[]>(user?.[field] ?? []);
    const saved = user?.[field];
    // The saved pins, when the profile comes back with them.
    useEffect(() => setPinned(saved ?? []), [saved]);
    const slots = data?.look[PINS[field].slots] ?? 0;

    const save = (next: number[], onDone?: () => void) => {
        const was = pinned;
        setPinned(next);
        setStyle.mutate(
            { [field]: next },
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
        // Out of room: the slot itself, in the shop, rather than a no.
        if (next.length > slots) {
            navigate(`/shop?item=${PINS[field].item}`);
            return;
        }
        save(next);
    };

    return { slots, pinned, toggle, save, saving: setStyle.isPending };
};

export const usePinReviews = () => usePins("pinnedReviews");
