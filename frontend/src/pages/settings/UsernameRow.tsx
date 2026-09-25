import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import LoadingSpinner from "../../components/LoadingSpinner";
import { checkUsernameAvailable } from "../../api";
import { useUpdateProfile } from "../../hooks/queries/useProfiles";
import { useNotify } from "../../contexts/NotificationContext";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import Button from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { cn } from "../../lib/cn";

type Availability =
    | { state: "idle" }
    | { state: "checking" }
    | { state: "free" }
    | { state: "taken" }
    | { state: "invalid"; reason: string };

/** Mirrors UsernameSchema, so the field says no before the request does. */
const validate = (value: string): string | null => {
    if (value.length < 3) return "At least 3 characters.";
    if (value.length > 20) return "At most 20 characters.";
    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
        return "Letters, numbers and underscores only.";
    }
    return null;
};

/**
 * The username field, checked as you type and saved on its own. A rename
 * changes your profile URL and can fail because someone else got there first,
 * so it says whether the name is free before you press anything.
 */
const UsernameRow = ({ current }: { current: string }) => {
    const notify = useNotify();
    const update = useUpdateProfile();

    const [value, setValue] = useState(current);
    const [availability, setAvailability] = useState<Availability>({
        state: "idle",
    });

    const debounced = useDebouncedValue(value, 400);
    const changed = value.trim() !== current;

    useEffect(() => {
        setValue(current);
    }, [current]);

    useEffect(() => {
        const name = debounced.trim();
        if (name === current || name === "") {
            return setAvailability({ state: "idle" });
        }

        const reason = validate(name);
        if (reason) return setAvailability({ state: "invalid", reason });

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

    const save = async () => {
        try {
            await update.mutateAsync({ username: value.trim() });
            notify("Username updated", "success");
            setAvailability({ state: "idle" });
        } catch {
            notify("Couldn't change your username", "error");
        }
    };

    const message: Record<Availability["state"], string> = {
        idle: `Your profile lives at /user/${value.trim() || "…"}`,
        checking: "Checking…",
        free: `${value.trim()} is free.`,
        taken: `${value.trim()} is taken.`,
        invalid: availability.state === "invalid" ? availability.reason : "",
    };

    const tone =
        availability.state === "free"
            ? "text-success"
            : availability.state === "taken" || availability.state === "invalid"
              ? "text-danger"
              : "text-content-muted";

    return (
        <div className="flex flex-col gap-2">
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Input
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        aria-label="Username"
                        aria-invalid={
                            availability.state === "taken" ||
                            availability.state === "invalid"
                        }
                        className="pr-9"
                    />
                    <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2">
                        {availability.state === "checking" && (
                            <LoadingSpinner
                                size="sm"
                                label="Checking the username"
                                className="text-content-muted"
                            />
                        )}
                        {availability.state === "free" && (
                            <Check
                                size={15}
                                aria-hidden
                                className="text-success"
                            />
                        )}
                        {(availability.state === "taken" ||
                            availability.state === "invalid") && (
                            <X size={15} aria-hidden className="text-danger" />
                        )}
                    </span>
                </div>

                <Button
                    onClick={() => void save()}
                    disabled={
                        !changed ||
                        availability.state !== "free" ||
                        update.isPending
                    }
                >
                    {update.isPending ? "Saving…" : "Change"}
                </Button>
            </div>

            <p className={cn("text-xs", tone)} aria-live="polite">
                {message[availability.state]}
            </p>
        </div>
    );
};

export default UsernameRow;
