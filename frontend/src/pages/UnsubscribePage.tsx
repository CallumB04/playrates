import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    emailScopeLabel,
    type EmailScope,
    type UnsubscribeStatus,
} from "@playrates/shared";
import { useNotify } from "../contexts/NotificationContext";
import { usePageMeta } from "../hooks/usePageMeta";
import {
    ApiError,
    queryKeys,
    resubscribeEmail,
    unsubscribeEmail,
} from "../api";
import Button, { buttonClass } from "../components/ui/Button";
import { cardClass } from "../components/ui/Card";
import EmptyPlate from "../components/ui/EmptyPlate";
import { TextSkeleton } from "../components/ui/Skeleton";

const SETTINGS = "/settings?section=emails";

/** "Friend requests" reads as "emails about friend requests". */
const about = (scope: EmailScope) => {
    const label = emailScopeLabel(scope);
    return label.charAt(0).toLowerCase() + label.slice(1);
};

const sentence = ({ scope, on }: UnsubscribeStatus) => {
    if (scope === "all")
        return on
            ? "Emails from PlayRates are back on."
            : "You won't get any more emails from PlayRates, apart from account ones like password resets.";
    return on
        ? `You'll get emails about ${about(scope)} again.`
        : `You won't get emails about ${about(scope)} any more.`;
};

/**
 * Where the unsubscribe link in every email lands. The token is the proof,
 * so it works signed out, and the link alone turns the emails off: asking
 * for a second click is what makes people mark mail as spam instead.
 */
const UnsubscribePage = () => {
    usePageMeta({ title: "Unsubscribe", noindex: true });
    const [params] = useSearchParams();
    const token = params.get("t") ?? "";
    const notify = useNotify();
    const queryClient = useQueryClient();
    const [steps, setSteps] = useState<UnsubscribeStatus[]>([]);
    const current = steps.at(-1);

    // Signed in, Settings is showing whatever the cache last held.
    const refreshProfile = () =>
        queryClient.invalidateQueries({ queryKey: queryKeys.profiles.me });

    const unsubscribe = useMutation({
        mutationFn: unsubscribeEmail,
        onSuccess: (status, { all }) => {
            // Turning off everything is a step of its own, for Undo to
            // take back to the category the link was for.
            setSteps((was) =>
                all ? [...was, status] : [...was.slice(0, -1), status]
            );
            void refreshProfile();
        },
    });
    const resubscribe = useMutation({
        mutationFn: resubscribeEmail,
        onSuccess: (status, { all }) => {
            setSteps((was) =>
                all ? was.slice(0, -1) : [...was.slice(0, -1), status]
            );
            void refreshProfile();
        },
        onError: () => notify("That didn't go through", "error"),
    });

    /* StrictMode runs effects twice in development, and the ref outlives
       that, so the link is only followed once. */
    const followed = useRef<string | null>(null);
    const { mutate: follow } = unsubscribe;
    useEffect(() => {
        if (!token || followed.current === token) return;
        followed.current = token;
        follow({ token });
    }, [token, follow]);

    const turnOffAll = () =>
        unsubscribe.mutate(
            { token, all: true },
            { onError: () => notify("That didn't go through", "error") }
        );

    const undo = () => {
        if (!current) return;
        resubscribe.mutate({
            token,
            all: current.scope === "all" && steps.length > 1,
        });
    };

    const settingsLink = (
        <Link
            to={SETTINGS}
            className={buttonClass("ghost", "w-full sm:w-auto")}
        >
            Email settings
        </Link>
    );

    // Not a rate limit or an outage: those are worth trying again.
    const invalid =
        !token ||
        (!current &&
            unsubscribe.error instanceof ApiError &&
            [400, 404, 422].includes(unsubscribe.error.status ?? 0));

    if (invalid) {
        return (
            <EmptyPlate
                title="That link doesn't work"
                body="It may have been cut short when it was copied. You can still choose which emails you get in your settings."
                action={
                    <Link to={SETTINGS} className={buttonClass("primary")}>
                        Email settings
                    </Link>
                }
            />
        );
    }

    if (!current && unsubscribe.isError) {
        return (
            <EmptyPlate
                title="That didn't go through"
                body="Nothing has changed yet. Try again in a moment, or choose which emails you get in your settings."
                action={
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <Button
                            onClick={() => unsubscribe.mutate({ token })}
                            className="w-full sm:w-auto"
                        >
                            Try again
                        </Button>
                        {settingsLink}
                    </div>
                }
            />
        );
    }

    if (!current) return <TextSkeleton lines={4} />;

    const busy = resubscribe.isPending || unsubscribe.isPending;

    return (
        <div className="mx-auto flex w-full max-w-[480px] flex-col gap-5">
            <h1 className="font-display text-title text-content">
                {current.on ? "You're subscribed again" : "You're unsubscribed"}
            </h1>
            <div className={cardClass("flex flex-col gap-5")}>
                <p className="text-body-sm text-content-secondary">
                    {sentence(current)}
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    {current.on ? (
                        <Button
                            variant="secondary"
                            onClick={() =>
                                unsubscribe.mutate(
                                    { token },
                                    {
                                        onError: () =>
                                            notify(
                                                "That didn't go through",
                                                "error"
                                            ),
                                    }
                                )
                            }
                            disabled={busy}
                            className="w-full sm:w-auto"
                        >
                            Unsubscribe
                        </Button>
                    ) : (
                        <Button
                            variant="secondary"
                            onClick={undo}
                            disabled={busy}
                            className="w-full sm:w-auto"
                        >
                            Undo
                        </Button>
                    )}
                    {!current.on && current.scope !== "all" && (
                        <Button
                            variant="secondary"
                            onClick={turnOffAll}
                            disabled={busy}
                            className="w-full sm:w-auto"
                        >
                            Turn off all emails
                        </Button>
                    )}
                    {settingsLink}
                </div>
            </div>
        </div>
    );
};

export default UnsubscribePage;
