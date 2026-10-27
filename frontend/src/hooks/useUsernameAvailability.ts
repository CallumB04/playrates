import { useEffect, useState } from "react";
import { UsernameSchema } from "@playrates/shared";
import { checkUsernameAvailable } from "../api";
import { useDebouncedValue } from "./useDebouncedValue";

export type UsernameAvailability =
    | { state: "idle" }
    | { state: "checking" }
    | { state: "free" }
    | { state: "taken" }
    | { state: "invalid"; reason: string };

/**
 * Whether a username could be had, checked as it is typed. `current` is the
 * name already held, which is neither free nor taken: it is yours.
 */
export const useUsernameAvailability = (
    value: string,
    current?: string
): UsernameAvailability => {
    const [availability, setAvailability] = useState<UsernameAvailability>({
        state: "idle",
    });
    const debounced = useDebouncedValue(value, 400);

    useEffect(() => {
        const name = debounced.trim();
        if (name === "" || name === current) {
            return setAvailability({ state: "idle" });
        }

        // The schema the API validates with, so the field says no first.
        const parsed = UsernameSchema.safeParse(name);
        if (!parsed.success) {
            return setAvailability({
                state: "invalid",
                reason: parsed.error.issues[0]?.message ?? "Not a username.",
            });
        }

        let active = true;
        setAvailability({ state: "checking" });
        checkUsernameAvailable(name)
            .then((free) => {
                if (active) setAvailability({ state: free ? "free" : "taken" });
            })
            .catch(() => {
                // A failed check is not a taken name; let the save decide.
                if (active) setAvailability({ state: "idle" });
            });

        return () => {
            active = false;
        };
    }, [debounced, current]);

    return availability;
};
