import { useId, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import {
    REPORT_DETAILS_MAX,
    REPORT_REASON_LABELS,
    REPORT_REASONS,
    type ReportReason,
    type ReportTarget,
} from "@playrates/shared";
import { ApiError, createReport } from "../api";
import { useNotify } from "../contexts/NotificationContext";
import Modal from "./ui/Modal";
import Button from "./ui/Button";
import Field from "./ui/Field";
import { Textarea } from "./ui/Input";
import { cn } from "../lib/cn";

const NOUNS: Record<ReportTarget, string> = {
    thread: "thread",
    message: "message",
    review: "review",
    profile: "profile",
};

interface ReportDialogProps {
    targetType: ReportTarget;
    targetId: string | number;
    onClose: () => void;
}

const ReportDialog = ({ targetType, targetId, onClose }: ReportDialogProps) => {
    const titleId = useId();
    const notify = useNotify();
    const [reason, setReason] = useState<ReportReason | null>(null);
    const [details, setDetails] = useState("");
    const [error, setError] = useState<string | null>(null);

    const send = useMutation({
        mutationFn: () =>
            createReport({
                targetType,
                targetId: String(targetId),
                reason: reason!,
                details: details.trim() || undefined,
            }),
        onSuccess: () => {
            notify("Thanks. I'll take a look.", "success");
            onClose();
        },
        onError: (err) => {
            if (err instanceof ApiError && err.status === 409) {
                notify("You've already reported this.", "info");
                onClose();
                return;
            }
            setError(
                err instanceof ApiError && err.message
                    ? err.message
                    : "Couldn't send that report. Try again in a moment."
            );
        },
    });

    return (
        <Modal
            onClose={onClose}
            labelledBy={titleId}
            className="w-full max-w-md"
        >
            <h2
                id={titleId}
                className="border-b border-subtle pb-3 font-display text-section text-content"
            >
                Report this {NOUNS[targetType]}
            </h2>

            <form
                className="flex flex-col gap-4 pt-4"
                onSubmit={(event) => {
                    event.preventDefault();
                    if (reason) send.mutate();
                }}
            >
                <fieldset>
                    <legend className="text-body-sm text-content-secondary">
                        What&rsquo;s wrong with it?
                    </legend>
                    <div className="mt-2 flex flex-col gap-1.5">
                        {REPORT_REASONS.map((value) => (
                            <label
                                key={value}
                                className={cn(
                                    "flex min-h-11 cursor-pointer items-center gap-3 rounded-sm border px-3 text-body-sm",
                                    reason === value
                                        ? "border-brand bg-surface-selected text-content"
                                        : "border-subtle text-content-secondary hover:border-strong"
                                )}
                            >
                                <input
                                    type="radio"
                                    name="reason"
                                    value={value}
                                    checked={reason === value}
                                    onChange={() => setReason(value)}
                                    className="accent-brand"
                                />
                                {REPORT_REASON_LABELS[value]}
                            </label>
                        ))}
                    </div>
                </fieldset>

                <Field
                    label="Anything else I should know?"
                    help="Optional."
                    error={error ?? undefined}
                >
                    {(a11y) => (
                        <Textarea
                            {...a11y}
                            rows={3}
                            maxLength={REPORT_DETAILS_MAX}
                            value={details}
                            onChange={(event) => setDetails(event.target.value)}
                        />
                    )}
                </Field>

                <p className="text-label text-content-muted">
                    Reports go to me, not to the person you&rsquo;re reporting.
                    If someone is in danger, contact the police first. More in
                    the{" "}
                    <Link
                        to="/terms#reporting"
                        className="underline underline-offset-2 hover:text-brand"
                        onClick={onClose}
                    >
                        terms
                    </Link>
                    .
                </p>

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onClose}
                        disabled={send.isPending}
                    >
                        Cancel
                    </Button>
                    <Button type="submit" disabled={!reason || send.isPending}>
                        {send.isPending ? "Sending…" : "Send report"}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default ReportDialog;
