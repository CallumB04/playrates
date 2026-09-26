import { useEffect, useRef, useState, type ReactNode } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Placeholder } from "@tiptap/extensions";
import {
    Bold,
    EyeOff,
    Heading1,
    Heading2,
    Heading3,
    ImagePlus,
    Italic,
    List,
    ListOrdered,
    Underline,
} from "lucide-react";
import {
    RICH_TEXT_MAX_IMAGES,
    countImages,
    type RichTextDoc,
} from "@playrates/shared";
import { uploadCommunityImage } from "../../api";
import { useNotify } from "../../contexts/NotificationContext";
import { compressCommunityImage } from "../../lib/communityImage";
import { cn } from "../../lib/cn";
import LoadingSpinner from "../LoadingSpinner";
import { Spoiler } from "./spoilerMark";

interface RichTextEditorProps {
    /** The starting document. Read once; remount with a new key to reset. */
    initial?: RichTextDoc | null;
    onChange: (doc: RichTextDoc) => void;
    placeholder?: string;
    /** Names the field for assistive tech. */
    label: string;
    autoFocus?: boolean;
    disabled?: boolean;
    /** Tells the form a picture is still on its way, so it waits to post. */
    onUploadingChange?: (uploading: boolean) => void;
    /** Ctrl+Enter (Cmd+Enter on a Mac). Plain Enter is a new line. */
    onSubmit?: () => void;
    className?: string;
}

const ToolButton = ({
    label,
    active,
    onClick,
    disabled,
    children,
}: {
    label: string;
    active?: boolean;
    onClick: () => void;
    disabled?: boolean;
    children: ReactNode;
}) => (
    <button
        type="button"
        aria-label={label}
        aria-pressed={active}
        title={label}
        disabled={disabled}
        // Keeps the editor's selection: a click would otherwise blur it first.
        onMouseDown={(event) => event.preventDefault()}
        onClick={onClick}
        className={cn(
            "grid size-11 shrink-0 cursor-pointer place-items-center rounded-sm lift sm:size-9",
            "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
            "disabled:cursor-not-allowed disabled:opacity-50",
            active
                ? "bg-brand-subtle text-brand"
                : "text-content-secondary hover:bg-surface-hover hover:text-content"
        )}
    >
        {children}
    </button>
);

/**
 * The community's editor: bold, italic, underline, spoilers, three heading
 * levels, lists and pictures, and nothing else — the API refuses anything outside that set, so
 * the editor never offers it.
 */
const RichTextEditor = ({
    initial,
    onChange,
    placeholder = "Write something…",
    label,
    autoFocus = false,
    disabled = false,
    onUploadingChange,
    onSubmit,
    className,
}: RichTextEditorProps) => {
    const notify = useNotify();
    const fileRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(0);

    /* The editor's handlers are fixed when it is created, so they reach the
       current props through refs rather than a closure. */
    const uploadRef = useRef<(files: File[]) => void>(() => {});
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    const onSubmitRef = useRef(onSubmit);
    onSubmitRef.current = onSubmit;

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3] },
                blockquote: false,
                code: false,
                codeBlock: false,
                horizontalRule: false,
                strike: false,
                link: false,
            }),
            Image.configure({ inline: false, allowBase64: false }),
            Spoiler,
            Placeholder.configure({ placeholder }),
        ],
        content: initial ?? undefined,
        editable: !disabled,
        autofocus: autoFocus ? "end" : false,
        editorProps: {
            attributes: {
                "aria-label": label,
                "aria-multiline": "true",
                role: "textbox",
                // 16px: iOS Safari zooms the page in on a smaller field and never back out.
                class: "rich-text min-h-32 px-3.5 py-3 text-base sm:text-body",
            },
            /* A picture pasted from another site would point at that site;
               the API only shows ones uploaded here, so they are left out
               and the text comes through on its own. */
            transformPastedHTML: (html) => html.replace(/<img[^>]*>/gi, ""),
            handleKeyDown: (_view, event) => {
                if (
                    event.key !== "Enter" ||
                    !(event.ctrlKey || event.metaKey) ||
                    !onSubmitRef.current
                ) {
                    return false;
                }
                event.preventDefault();
                onSubmitRef.current();
                return true;
            },
            handlePaste: (_view, event) => {
                const files = imageFiles(event.clipboardData?.files);
                if (files.length === 0) return false;
                uploadRef.current(files);
                return true;
            },
            handleDrop: (_view, event) => {
                const files = imageFiles(event.dataTransfer?.files);
                if (files.length === 0) return false;
                event.preventDefault();
                uploadRef.current(files);
                return true;
            },
        },
        onUpdate: ({ editor }) =>
            onChangeRef.current(editor.getJSON() as RichTextDoc),
    });

    const state = useEditorState({
        editor,
        selector: ({ editor }) =>
            editor
                ? {
                      bold: editor.isActive("bold"),
                      italic: editor.isActive("italic"),
                      underline: editor.isActive("underline"),
                      spoiler: editor.isActive("spoiler"),
                      h1: editor.isActive("heading", { level: 1 }),
                      h2: editor.isActive("heading", { level: 2 }),
                      h3: editor.isActive("heading", { level: 3 }),
                      bullets: editor.isActive("bulletList"),
                      numbers: editor.isActive("orderedList"),
                  }
                : null,
    });

    useEffect(() => {
        editor?.setEditable(!disabled);
    }, [editor, disabled]);

    useEffect(() => {
        onUploadingChange?.(uploading > 0);
    }, [uploading, onUploadingChange]);

    uploadRef.current = (files: File[]) => {
        if (!editor) return;
        const room =
            RICH_TEXT_MAX_IMAGES -
            countImages(editor.getJSON() as RichTextDoc) -
            uploading;
        if (room <= 0) {
            notify(
                `A message can hold ${RICH_TEXT_MAX_IMAGES} pictures`,
                "error"
            );
            return;
        }

        for (const file of files.slice(0, room)) {
            setUploading((n) => n + 1);
            void compressCommunityImage(file)
                .then(uploadCommunityImage)
                .then(({ url }) => {
                    editor.chain().focus().setImage({ src: url }).run();
                })
                .catch((error: unknown) => {
                    notify(
                        error instanceof Error
                            ? error.message
                            : "That picture didn't upload",
                        "error"
                    );
                })
                .finally(() => setUploading((n) => n - 1));
        }
    };

    const chain = () => editor?.chain().focus();

    return (
        <div
            className={cn(
                "overflow-hidden rounded-sm border border-subtle bg-surface-field lift",
                "focus-within:border-brand focus-within:shadow-glow",
                disabled && "opacity-60",
                className
            )}
        >
            <div
                role="toolbar"
                aria-label="Formatting"
                className="flex flex-wrap items-center gap-0.5 border-b border-subtle bg-surface-sunken/40 p-1"
            >
                <ToolButton
                    label="Bold"
                    active={state?.bold}
                    disabled={disabled}
                    onClick={() => chain()?.toggleBold().run()}
                >
                    <Bold size={16} aria-hidden />
                </ToolButton>
                <ToolButton
                    label="Italic"
                    active={state?.italic}
                    disabled={disabled}
                    onClick={() => chain()?.toggleItalic().run()}
                >
                    <Italic size={16} aria-hidden />
                </ToolButton>
                <ToolButton
                    label="Underline"
                    active={state?.underline}
                    disabled={disabled}
                    onClick={() => chain()?.toggleUnderline().run()}
                >
                    <Underline size={16} aria-hidden />
                </ToolButton>
                <ToolButton
                    label="Spoiler"
                    active={state?.spoiler}
                    disabled={disabled}
                    onClick={() => chain()?.toggleMark("spoiler").run()}
                >
                    <EyeOff size={16} aria-hidden />
                </ToolButton>

                <span aria-hidden className="mx-1 h-5 w-px bg-subtle" />

                <ToolButton
                    label="Heading 1"
                    active={state?.h1}
                    disabled={disabled}
                    onClick={() => chain()?.toggleHeading({ level: 1 }).run()}
                >
                    <Heading1 size={17} aria-hidden />
                </ToolButton>
                <ToolButton
                    label="Heading 2"
                    active={state?.h2}
                    disabled={disabled}
                    onClick={() => chain()?.toggleHeading({ level: 2 }).run()}
                >
                    <Heading2 size={17} aria-hidden />
                </ToolButton>
                <ToolButton
                    label="Heading 3"
                    active={state?.h3}
                    disabled={disabled}
                    onClick={() => chain()?.toggleHeading({ level: 3 }).run()}
                >
                    <Heading3 size={17} aria-hidden />
                </ToolButton>

                <span aria-hidden className="mx-1 h-5 w-px bg-subtle" />

                <ToolButton
                    label="Bulleted list"
                    active={state?.bullets}
                    disabled={disabled}
                    onClick={() => chain()?.toggleBulletList().run()}
                >
                    <List size={17} aria-hidden />
                </ToolButton>
                <ToolButton
                    label="Numbered list"
                    active={state?.numbers}
                    disabled={disabled}
                    onClick={() => chain()?.toggleOrderedList().run()}
                >
                    <ListOrdered size={17} aria-hidden />
                </ToolButton>

                <span aria-hidden className="mx-1 h-5 w-px bg-subtle" />

                <ToolButton
                    label="Add a picture"
                    disabled={disabled}
                    onClick={() => fileRef.current?.click()}
                >
                    <ImagePlus size={17} aria-hidden />
                </ToolButton>
                <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    onChange={(event) => {
                        uploadRef.current(imageFiles(event.target.files));
                        event.target.value = "";
                    }}
                />

                {uploading > 0 && (
                    <span className="ml-auto flex items-center gap-2 px-2 text-label-sm text-content-muted">
                        <LoadingSpinner size="xs" label={null} />
                        Uploading…
                    </span>
                )}
            </div>

            <EditorContent editor={editor} />
        </div>
    );
};

const imageFiles = (list: FileList | null | undefined): File[] =>
    Array.from(list ?? []).filter((file) => file.type.startsWith("image/"));

export default RichTextEditor;
