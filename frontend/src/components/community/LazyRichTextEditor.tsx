import { lazy, Suspense, type ComponentProps } from "react";
import { cn } from "../../lib/cn";

/* Tiptap and ProseMirror are most of a thread page's weight, and a reader
   who never writes never needs them. */
const RichTextEditor = lazy(() => import("./RichTextEditor"));

type Props = ComponentProps<typeof RichTextEditor>;

/** The editor's frame while its code loads, the same size so nothing
 *  below it moves when it arrives. */
const EditorFrame = ({ className }: { className?: string }) => (
    <div
        aria-hidden
        className={cn(
            "overflow-hidden rounded-sm border border-subtle bg-surface-field lift",
            className
        )}
    >
        <div className="h-9 border-b border-subtle bg-surface-sunken/40" />
        <div className="min-h-32" />
    </div>
);

const LazyRichTextEditor = (props: Props) => (
    <Suspense fallback={<EditorFrame className={props.className} />}>
        <RichTextEditor {...props} />
    </Suspense>
);

export default LazyRichTextEditor;
