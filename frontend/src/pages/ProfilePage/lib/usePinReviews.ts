import { useEffect, useState } from "react";
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
 *  to the slots you have. Shows a change at once, before the save lands.
 *  Out of room, `buying` is the slot to offer, which pins it once bought. */
export const usePins = (field: keyof typeof PINS) => {
    const { user } = useAuth();
    const { data } = useProgressQuery(!!user);
    const setStyle = useSetStyle();
    const notify = useNotify();
    const [pinned, setPinned] = useState<number[]>(user?.[field] ?? []);
    const saved = user?.[field];
    // The saved pins, when the profile comes back with them.
    useEffect(() => setPinned(saved ?? []), [saved]);
    const slots = data?.look[PINS[field].slots] ?? 0;
    // What was being pinned when there was no room for it.
    const [waiting, setWaiting] = useState<number | null>(null);

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
        // Out of room: the slot itself, here, rather than a no or the shop.
        if (next.length > slots) {
            setWaiting(id);
            return;
        }
        save(next);
    };

    const buying =
        waiting === null
            ? null
            : {
                  item: PINS[field].item,
                  onBought: () => save([...pinned, waiting]),
                  onClose: () => setWaiting(null),
              };

    return {
        slots,
        pinned,
        toggle,
        save,
        saving: setStyle.isPending,
        buying,
    };
};

export const usePinReviews = () => usePins("pinnedReviews");
