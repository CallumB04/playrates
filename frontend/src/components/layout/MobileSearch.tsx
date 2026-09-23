import { createPortal } from "react-dom";
import { X } from "lucide-react";
import GlobalSearch from "./GlobalSearch";
import { useOverlay } from "../../hooks/useOverlay";

interface MobileSearchProps {
    onClose: () => void;
}

/** Search below `xl`, where there is no room for the masthead field. */
const MobileSearch = ({ onClose }: MobileSearchProps) => {
    useOverlay(onClose);

    return createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Search"
            className="fixed inset-0 z-50 flex h-dvh animate-settle flex-col bg-surface px-5 pt-6 pb-[calc(--spacing(4)+env(safe-area-inset-bottom))] sm:px-8 xl:hidden"
        >
            <div className="mb-4 flex items-center justify-between gap-4">
                <span className="font-display text-2xl font-bold text-content">
                    Search
                </span>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close search"
                    className="-mr-[10px] flex size-11 items-center justify-center rounded-sm text-content lift hover:text-brand"
                >
                    <X size={24} />
                </button>
            </div>

            <GlobalSearch variant="overlay" onClose={onClose} />
        </div>,
        document.body
    );
};

export default MobileSearch;
