import { useId, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import Popup from "../../../components/ui/Popup";
import { cn } from "../../../lib/cn";

/** A link-weight "see all" that opens the full list in a popup, so the page
 *  itself only ever carries the first few. */
export const SeeAllButton = ({
    onClick,
    children = "See all",
    className,
}: {
    onClick: () => void;
    children?: ReactNode;
    className?: string;
}) => (
    <button
        type="button"
        onClick={onClick}
        aria-haspopup="dialog"
        className={cn(
            "relative inline-flex shrink-0 cursor-pointer items-center gap-0.5 text-label font-medium text-brand-text lift before:absolute before:-inset-x-2 before:-inset-y-3 before:content-[''] hover:underline sm:before:hidden",
            className
        )}
    >
        {children}
        <ChevronRight size={14} aria-hidden />
    </button>
);

/** The popup behind a "see all", titled with what it holds. */
export const SeeAllModal = ({
    title,
    onClose,
    wide = false,
    children,
}: {
    title: string;
    onClose: () => void;
    wide?: boolean;
    children: ReactNode;
}) => {
    const titleId = useId();
    return (
        <Popup
            onClose={onClose}
            titleId={titleId}
            width={cn("w-full", wide ? "sm:max-w-3xl" : "sm:max-w-2xl")}
            title={title}
        >
            {children}
        </Popup>
    );
};
