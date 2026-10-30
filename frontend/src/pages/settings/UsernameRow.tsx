import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import LoadingSpinner from "../../components/LoadingSpinner";
import { useUpdateProfile } from "../../hooks/queries/useProfiles";
import { useNotify } from "../../contexts/NotificationContext";
import { useUsernameAvailability } from "../../hooks/useUsernameAvailability";
import Button from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { cn } from "../../lib/cn";

/**
 * The username field, checked as you type and saved on its own. A rename
 * changes your profile URL and can fail because someone else got there first,
 * so it says whether the name is free before you press anything.
 */
const UsernameRow = ({ current }: { current: string }) => {
    const notify = useNotify();
    const update = useUpdateProfile();

    const [value, setValue] = useState(current);
    const availability = useUsernameAvailability(value, current);
    const changed = value.trim() !== current;

    useEffect(() => {
        setValue(current);
    }, [current]);

    const save = async () => {
        try {
            await update.mutateAsync({ username: value.trim() });
            notify("Username updated", "success");
        } catch {
            notify("Couldn't change your username", "error");
        }
    };

    const message: Record<typeof availability.state, string> = {
        idle: `Your profile is at /user/${value.trim() || "…"}`,
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
                    aria-label="Change username"
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
