import { X } from "lucide-react";
import { cn } from "../lib/cn";

interface ClosePopupIconProps {
    onClick: () => void;
    /** Over a popup's art below md, where it has to be light to be seen. */
    overArt?: boolean;
}

/** Positioned absolutely by the modal that renders it. */
const ClosePopupIcon: React.FC<ClosePopupIconProps> = ({
    onClick,
    overArt = false,
}) => (
    <button
        type="button"
        aria-label="Close"
        onClick={onClick}
        className={cn(
            "absolute top-[6px] right-[6px] z-10 flex size-11 cursor-pointer items-center justify-center transition-colors duration-200 hover:text-brand-text sm:top-3 sm:right-[14px] sm:size-auto sm:px-1",
            overArt
                ? "text-content max-md:text-content-on-media"
                : "text-content"
        )}
    >
        <X size={24} />
    </button>
);

export default ClosePopupIcon;
