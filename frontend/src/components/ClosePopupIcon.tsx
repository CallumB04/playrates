import { X } from "lucide-react";

interface ClosePopupIconProps {
    onClick: () => void;
}

/** Positioned absolutely by the modal that renders it. */
const ClosePopupIcon: React.FC<ClosePopupIconProps> = ({ onClick }) => (
    <button
        type="button"
        aria-label="Close"
        onClick={onClick}
        className="absolute top-[6px] right-[6px] flex size-11 cursor-pointer items-center justify-center text-content transition-colors duration-200 hover:text-brand sm:top-3 sm:right-[14px] sm:size-auto sm:px-1"
    >
        <X size={24} />
    </button>
);

export default ClosePopupIcon;
