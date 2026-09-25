import { cn } from "../../lib/cn";

// A Mac says Cmd where everything else says Ctrl.
const isMac = () =>
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPad/.test(navigator.userAgent);

/** "Ctrl + Enter to post", beside a send button. From sm only: a phone
 *  keyboard has no Ctrl, and there the button is the way to send. */
const SubmitHint = ({
    verb,
    className,
}: {
    verb: string;
    className?: string;
}) => (
    <span
        className={cn(
            "hidden items-center gap-1 text-label-sm text-content-muted sm:inline-flex",
            className
        )}
    >
        <kbd className="rounded-xs border border-subtle bg-surface-sunken px-1.5 py-px font-mono text-stamp">
            {isMac() ? "⌘" : "Ctrl"}
        </kbd>
        +
        <kbd className="rounded-xs border border-subtle bg-surface-sunken px-1.5 py-px font-mono text-stamp">
            Enter
        </kbd>
        to {verb}
    </span>
);

export default SubmitHint;
