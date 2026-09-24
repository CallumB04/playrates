import { useEffect, useId, useRef, useState } from "react";
import type { ProfileAccent } from "@playrates/shared";
import ProfilePicture from "./ProfilePicture";
import Button, { buttonClass } from "./ui/Button";
import { compressAvatar } from "../lib/avatarImage";
import { cn } from "../lib/cn";

/** What the editor is holding: the picture as it stands, a new one waiting to
 *  be saved, or a decision to go back to the generated one. */
export type AvatarChoice =
    | { kind: "unchanged" }
    | { kind: "picked"; image: Blob; preview: string }
    | { kind: "removed" };

interface AvatarFieldProps {
    username: string;
    /** So the generated avatar is the profile's colour, not the brand. */
    accent?: ProfileAccent;
    /** The picture already on the profile, if any. */
    current: string | null;
    choice: AvatarChoice;
    onChange: (choice: AvatarChoice) => void;
    disabled?: boolean;
}

const AvatarField = ({
    username,
    accent,
    current,
    choice,
    onChange,
    disabled = false,
}: AvatarFieldProps) => {
    const inputId = useId();
    const input = useRef<HTMLInputElement>(null);
    const [working, setWorking] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /* The preview is an object URL, and the browser holds the blob until it
       is revoked. */
    useEffect(() => {
        if (choice.kind !== "picked") return;
        return () => URL.revokeObjectURL(choice.preview);
    }, [choice]);

    const pick = async (file: File | undefined) => {
        if (!file) return;
        setError(null);
        setWorking(true);
        try {
            const image = await compressAvatar(file);
            onChange({
                kind: "picked",
                image,
                preview: URL.createObjectURL(image),
            });
        } catch (e) {
            setError(
                e instanceof Error ? e.message : "That image couldn't be used."
            );
        } finally {
            setWorking(false);
            // Lets the same file be picked again after an error.
            if (input.current) input.current.value = "";
        }
    };

    const shown =
        choice.kind === "picked"
            ? choice.preview
            : choice.kind === "removed"
              ? ""
              : (current ?? "");

    const canRemove = shown !== "" && !disabled && !working;
    const busy = disabled || working;
    const note =
        error ??
        (choice.kind === "unchanged" ? null : "Save changes to apply this.");

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center gap-4">
                <ProfilePicture
                    variant="review"
                    username={username}
                    accent={accent}
                    file={shown}
                    link={false}
                />

                <div className="flex min-w-0 flex-col gap-2">
                    <p className="text-body-sm text-content">Your picture</p>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* A label rather than a button: the file input is the
                            control, and clicking its label opens the picker
                            without any script. */}
                        <label
                            htmlFor={inputId}
                            className={cn(
                                buttonClass("secondary", undefined, "sm"),
                                "min-h-11 sm:min-h-9",
                                busy && "pointer-events-none opacity-60"
                            )}
                        >
                            {working
                                ? "Preparing…"
                                : disabled
                                  ? "Saving…"
                                  : shown
                                    ? "Change"
                                    : "Upload"}
                        </label>
                        <input
                            id={inputId}
                            ref={input}
                            type="file"
                            accept="image/*"
                            disabled={busy}
                            className="sr-only"
                            onChange={(e) => void pick(e.target.files?.[0])}
                        />

                        {canRemove && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="min-h-11 sm:min-h-9"
                                onClick={() => {
                                    setError(null);
                                    onChange({ kind: "removed" });
                                }}
                            >
                                Remove
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Nothing to say until something has changed or gone wrong. */}
            {note && (
                <p
                    role={error ? "alert" : undefined}
                    className={cn(
                        "text-label-sm",
                        error ? "text-danger" : "text-content-muted"
                    )}
                >
                    {note}
                </p>
            )}
        </div>
    );
};

export default AvatarField;
