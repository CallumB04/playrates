import { cn } from "../../lib/cn";

/** For a chip that has to be something other than a button — a link to a
 *  shelf, say, which navigates rather than filters. A "tag" takes the
 *  buttons' corners, for a chip that names a thing rather than filters. */
export const chipClass = (
    selected = false,
    className?: string,
    shape: "pill" | "tag" = "pill"
) =>
    cn(
        "inline-flex min-h-11 items-center gap-2 border px-3.5 text-label-sm lift sm:min-h-0 sm:py-1.5",
        shape === "pill" ? "rounded-full" : "rounded-sm",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        selected
            ? "border-action-edge bg-action text-action-ink shadow-solid"
            : "border-subtle bg-surface-raised text-content-secondary hover:-translate-y-px hover:border-strong hover:text-content",
        className
    );
