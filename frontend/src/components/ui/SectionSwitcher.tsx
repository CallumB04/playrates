import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { formatCount } from "../../lib/format";
import type { IconComponent } from "../../lib/icons";
import { cn } from "../../lib/cn";
import Modal from "./Modal";

/* A phone's way around a page with more sections than its width: one
   control that says where you are, and a sheet of the rest. The profile
   and Settings share it, so moving around either feels the same. */

export const CountPill = ({ value }: { value: number }) => (
    // Leading off, so the pill sits on the word's centre, not its baseline.
    <span className="rounded-full bg-surface-sunken px-2 py-1 font-mono text-label-sm leading-none text-content-secondary tabular-nums">
        {formatCount(value)}
    </span>
);

/** Written out whole, so Tailwind finds them. */
const HIDDEN_FROM = { sm: "sm:hidden", lg: "lg:hidden" } as const;

/** The closed control: the section you're in, and Switch. Phones only,
 *  unless the row it stands in for needs a wider screen than a phone's. */
export const SwitcherButton = ({
    icon: Icon,
    label,
    count,
    extra,
    open,
    onOpen,
    until = "sm",
}: {
    icon: IconComponent;
    label: string;
    count?: number;
    /** Beside Switch: something waiting elsewhere. */
    extra?: ReactNode;
    open: boolean;
    onOpen: () => void;
    /** The width from which the row takes over. */
    until?: keyof typeof HIDDEN_FROM;
}) => (
    <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={onOpen}
        className={cn(
            "flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-md border border-brand/50 bg-surface-raised py-2 pr-2 pl-3 text-left shadow-lip lift focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
            HIDDEN_FROM[until]
        )}
    >
        <Icon size={20} aria-hidden className="shrink-0 text-brand-text" />
        <span className="min-w-0 flex-1">
            <span className="block text-label-sm text-content-muted">
                Viewing
            </span>
            <span className="flex items-center gap-2 text-body font-semibold text-content">
                {label}
                {count !== undefined && <CountPill value={count} />}
            </span>
        </span>
        {extra}
        <span className="flex min-h-9 items-center gap-1 rounded-sm bg-brand-subtle px-3 text-label font-medium text-brand-text">
            Switch
            <ChevronDown size={16} aria-hidden />
        </span>
    </button>
);

/** The sheet of sections, two to a row. */
export const SwitcherSheet = ({
    title,
    titleId,
    onClose,
    children,
}: {
    title: ReactNode;
    titleId: string;
    onClose: () => void;
    children: ReactNode;
}) => (
    <Modal onClose={onClose} labelledBy={titleId} className="w-full max-w-sm">
        <h2
            id={titleId}
            className="pr-10 font-display text-section text-content"
        >
            {title}
        </h2>
        <ul className="mt-4 grid grid-cols-2 gap-2">{children}</ul>
    </Modal>
);

/** What goes inside a tile: the icon and count above, the name below. */
export const SwitcherTileBody = ({
    icon: Icon,
    label,
    active,
    count,
    note,
}: {
    icon: IconComponent;
    label: string;
    active: boolean;
    count?: number;
    note?: ReactNode;
}) => (
    <>
        <span className="flex items-center justify-between gap-2">
            <Icon
                size={20}
                aria-hidden
                className={cn(
                    "shrink-0",
                    active ? "text-brand-text" : "text-content-muted"
                )}
            />
            {count !== undefined && <CountPill value={count} />}
        </span>
        <span className="flex items-baseline justify-between gap-2">
            <span className={cn("text-body", active && "font-semibold")}>
                {label}
            </span>
            {note}
        </span>
    </>
);
