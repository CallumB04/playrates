import {
    forwardRef,
    type InputHTMLAttributes,
    type SelectHTMLAttributes,
    type TextareaHTMLAttributes,
} from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/cn";

/**
 * A field sits level with the page and lights up when you're in it — the
 * border warms to the brand and a soft bloom appears behind it. No recess:
 * nothing in Vellum is pressed into anything.
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
export const Select = forwardRef<
    HTMLSelectElement,
    SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
    <span className="relative block">
        <select
            ref={ref}
            className={cn(
                "min-h-11 w-full appearance-none border border-strong bg-surface py-2.5 pl-3 pr-9 text-body-sm text-content",
                "focus-visible:border-brand focus-visible:outline-none",
                "disabled:border-subtle disabled:text-content-muted",
                className
            )}
            {...props}
        />
        <ChevronDown
            size={13}
            aria-hidden
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-content-muted"
        />
    </span>
));
Select.displayName = "Select";

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
