import { cn } from "../../lib/cn";

/**
 * A field sits level with the page and lights up when you're in it.
 *
 * The page's own size on a phone too: public/viewport-init.js stops iOS
 * zooming in on a field under 16px, which is what used to hold them at 16.
 */
const FIELD =
    "lift min-h-11 w-full rounded-sm border border-subtle bg-surface-field px-3.5 py-2.5 text-body-sm text-content " +
    "placeholder:text-content-muted hover:border-strong " +
    "focus-visible:border-brand focus-visible:shadow-glow focus-visible:outline-none " +
    "aria-[invalid=true]:border-danger aria-[invalid=true]:bg-danger-subtle " +
    "disabled:border-subtle disabled:bg-surface-sunken disabled:text-content-muted disabled:shadow-none";

export const fieldClass = (className?: string) => cn(FIELD, className);
