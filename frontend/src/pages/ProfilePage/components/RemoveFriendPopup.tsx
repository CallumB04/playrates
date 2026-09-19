import ClosePopupIcon from "../../../components/ClosePopupIcon";

interface RemoveFriendPopupProps {
    closePopup: () => void;
    confirmRemove: () => Promise<void>;
    friendName: string;
}

const RemoveFriendPopup: React.FC<RemoveFriendPopupProps> = ({
    closePopup,
    confirmRemove,
    friendName,
}) => {
    // confirm friend removal and close popup
    const handleConfirm = () => {
        confirmRemove();
        closePopup();
    };

    return (
        <dialog className="popup-backdrop" onMouseDown={closePopup}>
            <div
                className="popup popup-default flex flex-col gap-6 text-center"
                onMouseDown={(event) => event.stopPropagation()}
            >
                <div className="flex w-full flex-col gap-3">
                    <h2 className="text-xl text-content">Remove Friend</h2>
                    <p className="max-w-[40ch] border-t border-t-subtle pt-3 font-light text-content-secondary">
                        Are you sure you want to remove{" "}
                        <span className="font-normal text-content">
                            {friendName}
                        </span>{" "}
                        as your friend? This cannot be undone.
                    </p>
                </div>
                <div className="flex w-full flex-col justify-center gap-5 sm:flex-row">
                    <button
                        className="button-danger w-full sm:w-1/2"
                        onClick={handleConfirm}
                    >
                        Remove
                    </button>
                    <button
                        className="button-outline button-outline-default w-full sm:w-1/2"
                        onClick={closePopup}
                    >
                        Cancel
                    </button>
                </div>

                <ClosePopupIcon onClick={closePopup} />
            </div>
        </dialog>
    );
};

export default RemoveFriendPopup;
