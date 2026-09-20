import { useState } from "react";
import type { UserStats } from "@playrates/shared";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import Field from "../../components/ui/Field";
import { formatCount } from "../../lib/format";

interface DeleteAccountModalProps {
    username: string;
    stats: UserStats | undefined;
    reviewCount: number | undefined;
    friendCount: number | undefined;
    isDeleting: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}

/**
 * The confirmation gate.
 *
 * Typing the username is the point: it is the difference between a click you
 * can make by accident and one you have to mean. The counts are listed because
 * "your account" is abstract and "412 logs" is not.
 */
const DeleteAccountModal = ({
    username,
    stats,
    reviewCount,
    friendCount,
    isDeleting,
    onCancel,
    onConfirm,
}: DeleteAccountModalProps) => {
    const [typed, setTyped] = useState("");
    const confirmed = typed.trim() === username;

    const losing = [
        { label: "game logs", value: stats?.logCount ?? 0 },
        { label: "reviews", value: reviewCount ?? 0 },
        { label: "friendships", value: friendCount ?? 0 },
    ].filter((row) => row.value > 0);

    return (
        <Modal
            onClose={onCancel}
            labelledBy="delete-account-title"
            className="w-full max-w-md"
        >
            <h2
                id="delete-account-title"
                className="border-b border-subtle pb-3 font-display text-section text-danger"
            >
                Delete your account
            </h2>

            <div className="flex flex-col gap-4 pt-4">
                <p className="text-body-sm text-content-secondary">
                    {losing.length > 0 ? (
                        <>
                            This permanently deletes your{" "}
                            {losing.map((row, i) => (
                                <span key={row.label}>
                                    {i > 0 &&
                                        (i === losing.length - 1
                                            ? " and "
                                            : ", ")}
                                    <span className="font-mono text-content">
                                        {formatCount(row.value)}
                                    </span>{" "}
                                    {row.label}
                                </span>
                            ))}
                            . It cannot be undone.
                        </>
                    ) : (
                        "This permanently deletes your account. It cannot be undone."
                    )}
                </p>

                <Field
                    label={`Type ${username} to confirm`}
                    help="Case sensitive."
                >
                    {(a11y) => (
                        <Input
                            value={typed}
                            onChange={(e) => setTyped(e.target.value)}
                            autoComplete="off"
                            spellCheck={false}
                            {...a11y}
                        />
                    )}
                </Field>

                <div className="flex justify-end gap-2.5">
                    <Button
                        variant="secondary"
                        onClick={onCancel}
                        disabled={isDeleting}
                    >
                        Keep my account
                    </Button>
                    <Button
                        variant="danger"
                        onClick={onConfirm}
                        disabled={!confirmed || isDeleting}
                    >
                        {isDeleting ? "Deleting…" : "Delete forever"}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default DeleteAccountModal;
