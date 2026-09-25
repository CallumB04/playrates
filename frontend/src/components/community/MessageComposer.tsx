import { useState } from "react";
import { isEmptyDoc, type RichTextDoc } from "@playrates/shared";
import { useNotify } from "../../contexts/NotificationContext";
import Button from "../ui/Button";
import RichTextEditor from "./RichTextEditor";
import SubmitHint from "./SubmitHint";

interface MessageComposerProps {
    onSubmit: (body: RichTextDoc) => Promise<unknown>;
    submitLabel: string;
    label: string;
    placeholder?: string;
    initial?: RichTextDoc | null;
    onCancel?: () => void;
    autoFocus?: boolean;
    /** Above the editor: who is being answered, say. */
    note?: string;
}

/** The editor with a send button, for replies, edits and patch notes. */
const MessageComposer = ({
    onSubmit,
    submitLabel,
    label,
    placeholder,
    initial = null,
    onCancel,
    autoFocus = false,
    note,
}: MessageComposerProps) => {
    const notify = useNotify();
    const [doc, setDoc] = useState<RichTextDoc | null>(initial);
    const [uploading, setUploading] = useState(false);
    const [pending, setPending] = useState(false);
    // Bumped after a send, which remounts the editor empty.
    const [round, setRound] = useState(0);

    const empty = !doc || isEmptyDoc(doc);

    const submit = async () => {
        if (!doc || empty || uploading) return;
        setPending(true);
        try {
            await onSubmit(doc);
            setDoc(initial);
            setRound((n) => n + 1);
        } catch (error) {
            notify(
                error instanceof Error ? error.message : "That didn't send",
                "error"
            );
        } finally {
            setPending(false);
        }
    };

    return (
        <div className="flex flex-col gap-2">
            {note && <p className="text-label-sm text-content-muted">{note}</p>}
            <RichTextEditor
                key={round}
                initial={initial}
                onChange={setDoc}
                label={label}
                placeholder={placeholder}
                autoFocus={autoFocus}
                disabled={pending}
                onUploadingChange={setUploading}
                onSubmit={() => void submit()}
            />
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
                <SubmitHint verb="send" className="sm:mr-auto" />
                {onCancel && (
                    <Button
                        type="button"
                        variant="secondary"
                        className="w-full sm:w-auto"
                        onClick={onCancel}
                        disabled={pending}
                    >
                        Cancel
                    </Button>
                )}
                <Button
                    type="button"
                    className="w-full sm:w-auto"
                    onClick={() => void submit()}
                    disabled={empty || uploading || pending}
                >
                    {uploading ? "Waiting for pictures…" : submitLabel}
                </Button>
            </div>
        </div>
    );
};

export default MessageComposer;
