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
        className="absolute top-3 right-[14px] cursor-pointer px-1 text-content transition-colors duration-200 hover:text-brand"
    >
        <X size={24} />
    </button>
);

export default ClosePopupIcon;
