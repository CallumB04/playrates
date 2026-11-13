import type { ReactNode } from "react";
import { X } from "lucide-react";
import { igdbSized } from "@playrates/shared";
import Modal from "./Modal";
import { cn } from "../../lib/cn";

export interface PopupProps {
    onClose: () => void;
    titleId: string;
    title: ReactNode;
    /** Over the title: where this sits, what it's worth. */
    eyebrow?: ReactNode;
    /** Under the title, a line on what to do. */
    blurb?: ReactNode;
    /** A game's wide art, or the art its step card shows. Only for a popup
     *  about one game or a Get started step; the rest go without. */
    art?: string | null;
    /** A game's cover, beside the title of a popup about that game. */
    cover?: string | null;
    /** Red for something that can't be undone. */
    tone?: "brand" | "danger";
    /** Under the heading and held with it, like the log editor's tabs. */
    tabs?: ReactNode;
    /** The way out. */
    footer?: ReactNode;
    /** The popup's width from sm up. */
    width?: string;
    /** For a long form: the footer stays put while it scrolls. */
    long?: boolean;
    /** False for the one popup that has to be answered, choosing a
     *  username: no close button. */
    closable?: boolean;
    children?: ReactNode;
}

const Close = ({
    onClose,
    className,
}: {
    onClose: () => void;
    className?: string;
}) => (
    <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className={cn(
            "grid size-9 shrink-0 cursor-pointer place-items-center rounded-full transition-colors duration-200 before:absolute before:-inset-1 before:content-['']",
            className
        )}
    >
        <X size={18} aria-hidden />
    </button>
);

/**
 * Every popup's frame, so a confirm, a step and the log editor read as
 * parts of one thing: the heading, the close, the colour and the way out
 * drawn the same, whatever the popup holds. A bottom sheet on a phone.
 */
const Popup = (props: PopupProps) => (
    <Modal
        onClose={props.onClose}
        labelledBy={props.titleId}
        showCloseButton={false}
        className={cn(
            props.width ?? "w-full sm:max-w-lg",
            "p-0! sm:rounded-xl! sm:p-0!"
        )}
    >
        <Frame {...props} />
    </Modal>
);

/* The art leads: a game's, or the art its step card shows, fading into
   the panel under the title. A popup with no picture, like a confirm, has
   a soft light in its tone instead, gone well before its foot. */
const Frame = ({
    onClose,
    titleId,
    title,
    eyebrow,
    blurb,
    art,
    cover,
    tone = "brand",
    tabs,
    footer,
    long,
    closable = true,
    children,
}: PopupProps) => (
    <div className="relative isolate">
        {!art && (
            <span
                aria-hidden
                className={cn(
                    "pointer-events-none absolute inset-x-0 top-0 -z-10 h-64",
                    tone === "danger"
                        ? "bg-[radial-gradient(ellipse_90%_100%_at_50%_0%,color-mix(in_srgb,var(--danger)_16%,transparent),transparent_75%)]"
                        : "bg-[radial-gradient(ellipse_90%_100%_at_50%_0%,color-mix(in_srgb,var(--brand)_16%,transparent),transparent_75%)]"
                )}
            />
        )}
        <header
            className={cn(
                "relative isolate px-5 sm:px-7",
                art ? "overflow-hidden pt-24 sm:pt-32" : "pt-6 sm:pt-8",
                tabs ? "pb-0" : "pb-4 sm:pb-5"
            )}
        >
            {art && (
                <>
                    <img
                        src={igdbSized(art, "screenshot_big")}
                        alt=""
                        className="absolute inset-0 -z-20 h-full w-full object-cover"
                    />
                    <span
                        aria-hidden
                        className="absolute inset-0 -z-10 bg-linear-to-t from-surface-raised from-25% via-surface-raised/75 to-surface-raised/10"
                    />
                </>
            )}
            <div className="flex items-end gap-4 pr-10">
                {cover && (
                    <img
                        src={igdbSized(cover, "cover_big")}
                        alt={typeof title === "string" ? title : ""}
                        className="aspect-3/4 w-14 shrink-0 rounded-md object-cover shadow-cover ring-1 ring-white/10 sm:w-20"
                    />
                )}
                <div className="min-w-0 flex-1">
                    {eyebrow && (
                        <p className="text-label-sm text-content-secondary">
                            {eyebrow}
                        </p>
                    )}
                    <h2
                        id={titleId}
                        className={cn(
                            "mt-0.5 font-display leading-tight",
                            art
                                ? "text-[24px] sm:text-[32px]"
                                : "text-[22px] sm:text-[26px]",
                            tone === "danger" ? "text-danger" : "text-content"
                        )}
                    >
                        {title}
                    </h2>
                    {blurb && (
                        <div className="mt-1.5 text-body-sm text-content-secondary">
                            {blurb}
                        </div>
                    )}
                </div>
            </div>
            {tabs && <div className="mt-3">{tabs}</div>}
            {closable && (
                <Close
                    onClose={onClose}
                    className={cn(
                        "absolute top-3 right-3 sm:top-4 sm:right-4",
                        art
                            ? "bg-media-scrim-strong text-content-on-media backdrop-blur-md hover:bg-overlay-chip-light"
                            : "text-content-muted hover:bg-surface-hover hover:text-content"
                    )}
                />
            )}
        </header>
        {children && (
            <div
                className={cn(
                    "px-5 sm:px-7",
                    !!tabs && "border-t border-subtle",
                    long ? "py-5" : "pb-5"
                )}
            >
                {children}
            </div>
        )}
        {footer && (
            <footer
                className={cn(
                    "px-5 pt-3 pb-[calc(--spacing(5)+env(safe-area-inset-bottom))] sm:px-7 sm:pb-6",
                    // Pinned only where there's a form to scroll past it.
                    long &&
                        "sticky bottom-0 z-10 border-t border-subtle bg-surface-raised/90 backdrop-blur-md sm:py-4"
                )}
            >
                {footer}
            </footer>
        )}
    </div>
);

export default Popup;
