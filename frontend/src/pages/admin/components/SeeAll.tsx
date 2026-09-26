import { useId, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import Modal from "../../../components/ui/Modal";
import { cn } from "../../../lib/cn";

/** A link-weight "see all" that opens the full list in a popup, so the page
 *  itself only ever carries the first few. */
export const SeeAllButton = ({ onClick, children = "See all", className }: { onClick: () => void; children?: ReactNode; className?: string }) => (
    <button
        type="button"
        onClick={onClick}
        aria-haspopup="dialog"
        className={cn(
            "relative inline-flex shrink-0 cursor-pointer items-center gap-0.5 text-label font-medium text-brand lift before:absolute before:-inset-x-2 before:-inset-y-3 before:content-[''] hover:underline sm:before:hidden",
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
        <Modal onClose={onClose} labelledBy={titleId} className={cn("w-full", wide ? "sm:max-w-3xl" : "sm:max-w-2xl")}>
            <h2 id={titleId} className="mb-5 pr-10 font-display text-section text-content">
                {title}
            </h2>
            {children}
        </Modal>
    );
};
