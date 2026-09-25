import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";

interface FilterPillProps {
    /** A small picture of what the list is narrowed to: a cover, a face. */
    leading: ReactNode;
    label: string;
    /** Where the label goes: the game, the profile. */
    to: string;
    /** What clearing does, for assistive tech. */
    clearLabel: string;
    onClear: () => void;
}

/**
 * Says the list is narrowed to one thing, and undoes it. The clear is a
 * labelled button of its own rather than an x inside the chip, so it reads
 * as the way out and not as part of the name.
 */
const FilterPill = ({
    leading,
    label,
    to,
    clearLabel,
    onClear,
}: FilterPillProps) => (
    <span className="inline-flex max-w-full min-w-0 items-center gap-2 rounded-full border border-brand/40 bg-brand-subtle py-1 pr-1 pl-1">
        <span className="grid size-7 shrink-0 place-items-center overflow-hidden rounded-full [&>*]:size-7">
            {leading}
        </span>
        <Link
            to={to}
            className="min-w-0 truncate text-body-sm font-semibold text-brand hover:underline"
        >
            {label}
        </Link>
        <button
            type="button"
            onClick={onClear}
            aria-label={clearLabel}
            className="relative inline-flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-full border border-subtle bg-surface-raised px-2.5 text-label-sm font-medium text-content-secondary lift before:absolute before:-inset-2 before:content-[''] hover:border-strong hover:text-content focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
            <X size={13} aria-hidden />
            Clear
        </button>
    </span>
);

export default FilterPill;
