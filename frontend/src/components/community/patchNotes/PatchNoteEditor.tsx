import { useId, useState } from "react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import {
    isAnnouncementHref,
    PATCH_NOTE_KIND_NAMES,
    PATCH_NOTE_KINDS,
    type PatchNote,
    type PatchNoteKind,
} from "@playrates/shared";
import Button from "../../ui/Button";
import Dropdown from "../../ui/Dropdown";
import { Input, Textarea } from "../../ui/Input";
import { cn } from "../../../lib/cn";
import { KIND_STYLE } from "./kinds";
import PatchNoteView from "./PatchNoteView";
import { noteFrom, problemWith, row, type Row } from "./patchNoteDraft";

const KIND_OPTIONS = PATCH_NOTE_KINDS.map((kind) => ({
    value: kind,
    label: PATCH_NOTE_KIND_NAMES[kind],
    icon: KIND_STYLE[kind].icon,
}));

/**
 * Writing a release: a title, an optional message above the changes and
 * one below, and the changes, each a feature, an improvement, a fix or
 * other, with a link where there's somewhere to go.
 */
const PatchNoteEditor = ({
    initial,
    submitLabel,
    onSubmit,
    onCancel,
}: {
    initial?: PatchNote | null;
    submitLabel: string;
    onSubmit: (note: PatchNote) => Promise<unknown>;
    onCancel?: () => void;
}) => {
    const id = useId();
    const [title, setTitle] = useState(initial?.title ?? "");
    const [intro, setIntro] = useState(initial?.intro ?? "");
    const [outro, setOutro] = useState(initial?.outro ?? "");
    const [rows, setRows] = useState<Row[]>(() =>
        initial?.items.length
            ? initial.items.map((i) => row(i.kind, i.text, i.link ?? ""))
            : [row()]
    );
    const [showProblem, setShowProblem] = useState(false);
    const [saving, setSaving] = useState(false);

    const note = noteFrom({ title, intro, rows, outro });
    const problem = problemWith(note, rows);

    const change = (key: number, patch: Partial<Row>) =>
        setRows((all) =>
            all.map((r) => (r.key === key ? { ...r, ...patch } : r))
        );
    const move = (index: number, by: -1 | 1) =>
        setRows((all) => {
            const next = [...all];
            const [taken] = next.splice(index, 1);
            next.splice(index + by, 0, taken!);
            return next;
        });

    const submit = async () => {
        if (problem) {
            setShowProblem(true);
            return;
        }
        setSaving(true);
        try {
            await onSubmit(note);
        } finally {
            setSaving(false);
        }
    };

    return (
        <form
            className="flex flex-col gap-5"
            onSubmit={(event) => {
                event.preventDefault();
                void submit();
            }}
        >
            <label className="flex flex-col gap-1.5">
                <span className="text-label text-content-secondary">Title</span>
                <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="v1.2"
                    maxLength={80}
                />
            </label>

            <label className="flex flex-col gap-1.5">
                <span className="text-label text-content-secondary">
                    Message at the top (optional)
                </span>
                <Textarea
                    value={intro}
                    onChange={(e) => setIntro(e.target.value)}
                    rows={3}
                    maxLength={2000}
                />
            </label>

            <fieldset className="flex flex-col gap-3">
                <legend className="text-label text-content-secondary">
                    Changes
                </legend>
                <p className="mt-1 text-body-sm text-content-muted">
                    A link starting /me goes to the reader’s own profile:
                    /me/lists, /me/games?type=wishlist, /me?edit=profile.
                </p>
                {rows.map((r, i) => (
                    <div
                        key={r.key}
                        className="flex flex-col gap-2 rounded-md border border-subtle p-2.5 sm:flex-row sm:items-start"
                    >
                        <div className="flex items-center gap-1 sm:w-40 sm:shrink-0">
                            <Dropdown
                                options={KIND_OPTIONS}
                                value={r.kind}
                                onChange={(kind) =>
                                    change(r.key, {
                                        kind: kind as PatchNoteKind,
                                    })
                                }
                                aria-label={`Change ${i + 1}: kind`}
                                className="min-w-0 flex-1"
                            />
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col gap-2">
                            <Input
                                value={r.text}
                                onChange={(e) =>
                                    change(r.key, { text: e.target.value })
                                }
                                placeholder="What changed"
                                aria-label={`Change ${i + 1}`}
                                maxLength={500}
                            />
                            <Input
                                value={r.link}
                                onChange={(e) =>
                                    change(r.key, { link: e.target.value })
                                }
                                placeholder="Link, if it goes somewhere: /me/lists, /settings or https://…"
                                aria-label={`Change ${i + 1}: link`}
                                aria-invalid={
                                    (showProblem &&
                                        !!r.link.trim() &&
                                        !isAnnouncementHref(r.link.trim())) ||
                                    undefined
                                }
                                maxLength={500}
                            />
                        </div>
                        <div className="flex items-center justify-end gap-1">
                            <IconButton
                                label={`Move change ${i + 1} up`}
                                disabled={i === 0}
                                onClick={() => move(i, -1)}
                            >
                                <ArrowUp size={15} aria-hidden />
                            </IconButton>
                            <IconButton
                                label={`Move change ${i + 1} down`}
                                disabled={i === rows.length - 1}
                                onClick={() => move(i, 1)}
                            >
                                <ArrowDown size={15} aria-hidden />
                            </IconButton>
                            <IconButton
                                label={`Remove change ${i + 1}`}
                                onClick={() =>
                                    setRows((all) =>
                                        all.length === 1
                                            ? [row()]
                                            : all.filter((x) => x.key !== r.key)
                                    )
                                }
                            >
                                <X size={15} aria-hidden />
                            </IconButton>
                        </div>
                    </div>
                ))}
                <Button
                    type="button"
                    variant="secondary"
                    className="w-full sm:w-auto sm:self-start"
                    onClick={() =>
                        setRows((all) => [...all, row(all.at(-1)?.kind)])
                    }
                >
                    <Plus size={15} aria-hidden />
                    Add a change
                </Button>
            </fieldset>

            <label className="flex flex-col gap-1.5">
                <span className="text-label text-content-secondary">
                    Message at the bottom (optional)
                </span>
                <Textarea
                    value={outro}
                    onChange={(e) => setOutro(e.target.value)}
                    rows={3}
                    maxLength={2000}
                />
            </label>

            {note.title && !problem && (
                <section
                    aria-labelledby={`${id}-preview`}
                    className="flex flex-col gap-3 border-t border-subtle pt-4"
                >
                    <h3
                        id={`${id}-preview`}
                        className="text-label text-content-muted"
                    >
                        How it will look
                    </h3>
                    <PatchNoteView note={note} />
                </section>
            )}

            {showProblem && problem && (
                <p role="alert" className="text-body-sm text-danger">
                    {problem}
                </p>
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                {onCancel && (
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onCancel}
                        className="w-full sm:w-auto"
                    >
                        Cancel
                    </Button>
                )}
                <Button
                    type="submit"
                    disabled={saving}
                    className="w-full sm:w-auto"
                >
                    {saving ? "Saving…" : submitLabel}
                </Button>
            </div>
        </form>
    );
};

const IconButton = ({
    label,
    disabled,
    onClick,
    children,
}: {
    label: string;
    disabled?: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) => (
    <button
        type="button"
        aria-label={label}
        title={label}
        disabled={disabled}
        onClick={onClick}
        className={cn(
            "grid size-11 cursor-pointer place-items-center rounded-sm text-content-muted lift sm:size-9",
            "hover:bg-surface-hover hover:text-content disabled:cursor-not-allowed disabled:opacity-40",
            "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
        )}
    >
        {children}
    </button>
);

export default PatchNoteEditor;
