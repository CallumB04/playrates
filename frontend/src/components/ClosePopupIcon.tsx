interface ClosePopupIconProps {
    onClick: () => void;
}

/**
 * Was a clickable <i>, so it could not be reached or activated by keyboard
 * and announced as nothing. Same glyph and position, now a real button.
 */
const ClosePopupIcon: React.FC<ClosePopupIconProps> = ({ onClick }) => (
    <button
        type="button"
        aria-label="Close"
        onClick={onClick}
        className="fas fa-xmark hover-text-white absolute right-[14px] top-3 px-1 text-2xl"
    ></button>
);

export default ClosePopupIcon;
