import { useId, useState, type FormEvent } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useUpdateProfile } from "../../hooks/queries/useProfiles";
import { useUsernameAvailability } from "../../hooks/useUsernameAvailability";
import { useSignOut } from "../../hooks/useSignOut";
import { ApiError } from "../../api/client";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField from "../auth/FormField";
import AgreeToTerms from "../auth/AgreeToTerms";
import { BRAND_NAME } from "../../constants/brand";

/**
 * A Google or Discord signup arrives on a generated name and without the
 * signup form's agreement, so it gets both here before anything else. There
 * is no closing it: the way out is a name, or signing out.
 *
 * The field starts empty on purpose. A name lifted from the provider account
 * is not one anybody chose here.
 */
const ChooseUsername = () => {
    const { user } = useAuth();
    if (!user || user.usernameChosenAt !== null) return null;
    return <ChooseUsernamePopup />;
};

const ChooseUsernamePopup = () => {
    const titleId = useId();
    const update = useUpdateProfile();
    const signOut = useSignOut();

    const [value, setValue] = useState("");
    const [agreed, setAgreed] = useState(false);
    const [error, setError] = useState<string>();
    const availability = useUsernameAvailability(value);

    const name = value.trim();
    const fieldError =
        error ??
        (availability.state === "taken"
            ? "Sorry, that username is taken."
            : availability.state === "invalid"
              ? availability.reason
              : undefined);

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(undefined);
        try {
            await update.mutateAsync({ username: name });
        } catch (err) {
            setError(
                err instanceof ApiError && err.status === 409
                    ? "Sorry, that username is taken."
                    : "That didn’t save. Please try again."
            );
        }
    };

    return (
        <Modal
            onClose={() => {}}
            showCloseButton={false}
            labelledBy={titleId}
            className="w-full sm:max-w-md"
        >
            <form onSubmit={submit} className="flex flex-col gap-5">
                <div>
                    <h2
                        id={titleId}
                        className="font-display text-section text-content"
                    >
                        Pick your username
                    </h2>
                    <p className="mt-1.5 text-body-sm text-content-secondary">
                        It’s how people find you on {BRAND_NAME}. You can change
                        it later in Settings.
                    </p>
                </div>

                <FormField
                    label="Username"
                    value={value}
                    onChange={(e) => {
                        setValue(e.target.value);
                        setError(undefined);
                    }}
                    placeholder="yourname"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    autoFocus
                    error={fieldError}
                    help={
                        availability.state === "free"
                            ? `${name} is free. Your profile will be at /user/${name}.`
                            : availability.state === "checking"
                              ? "Checking…"
                              : "Letters, numbers and underscores."
                    }
                />

                <AgreeToTerms
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                />

                <div className="flex flex-col gap-2">
                    <Button
                        type="submit"
                        size="lg"
                        disabled={
                            availability.state !== "free" ||
                            !agreed ||
                            update.isPending
                        }
                    >
                        {update.isPending ? "Saving…" : "Continue"}
                    </Button>
                    <Button type="button" variant="ghost" onClick={signOut}>
                        Sign out
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default ChooseUsername;
