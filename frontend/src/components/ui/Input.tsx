import {
    forwardRef,
    type InputHTMLAttributes,
    type TextareaHTMLAttributes,
} from "react";
import { cn } from "../../lib/cn";
import type { IconComponent } from "../../lib/icons";

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

export const Input = forwardRef<
    HTMLInputElement,
    InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
    <input ref={ref} className={fieldClass(className)} {...props} />
));
Input.displayName = "Input";

/** Tabular, because a number in a field is still a ledger figure. */
export const NumberInput = forwardRef<
    HTMLInputElement,
    InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
    <input
        ref={ref}
        type="number"
        inputMode="decimal"
        className={fieldClass(cn("font-mono tabular-nums", className))}
        {...props}
    />
));
NumberInput.displayName = "NumberInput";

/** Same skin as a field; the chevron is what says it opens. */
export const Textarea = forwardRef<
    HTMLTextAreaElement,
    TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
    <textarea
        ref={ref}
        className={fieldClass(cn("resize-none overflow-auto", className))}
        {...props}
    />
));
Textarea.displayName = "Textarea";

/** Padded on the right to clear the magnifier icon sat inside the field. */
export const SearchInput = forwardRef<
    HTMLInputElement,
    InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
    <input
        ref={ref}
        type="search"
        className={fieldClass(cn("pl-9", className))}
        {...props}
    />
));
SearchInput.displayName = "SearchInput";

/** A field with a mark inside its left edge, for one the mark says more
 *  about than its label: a social account, say. The mark is quiet while the
 *  field is empty and full colour once something is in it. */
export const IconInput = forwardRef<
    HTMLInputElement,
    InputHTMLAttributes<HTMLInputElement> & { icon: IconComponent }
>(({ icon: Icon, className, ...props }, ref) => (
    <div className="relative">
        {/* The input first, so the mark can follow it as a peer. */}
        <input
            ref={ref}
            className={fieldClass(cn("peer pl-10", className))}
            {...props}
        />
        <Icon
            size={16}
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-content peer-placeholder-shown:text-content-muted"
        />
    </div>
));
IconInput.displayName = "IconInput";
