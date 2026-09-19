import { useRef } from "react";
import ClosePopupIcon from "../../../components/ClosePopupIcon";

interface MobileSearchPopupProps {
    closePopup: () => void;
    onSearch: (value: string) => void;
}

const MobileSearchPopup: React.FC<MobileSearchPopupProps> = ({
    closePopup,
    onSearch,
}) => {
    const searchInput = useRef<HTMLInputElement>(null);

    const handleSearch = () => {
        // pass current value of search input into prop function
        if (searchInput.current) {
            onSearch(searchInput.current.value);
            closePopup();
        }
    };

    return (
        <dialog className="popup-backdrop" onMouseDown={closePopup}>
            <div
                className="popup popup-default flex w-full max-w-[550px] flex-col gap-3 text-center"
                onMouseDown={(event) => event.stopPropagation()}
            >
                <h2 className="text-xl text-content">Search for Game</h2>
                <div className="flex w-full flex-col gap-4 border-t border-t-subtle pt-3">
                    <input
                        type="text"
                        className="search-bar h-[52px] w-full"
                        placeholder="Search for a game..."
                        ref={searchInput}
                    />
                    <button
                        className="button-primary w-full"
                        onClick={handleSearch}
                    >
                        Search
                    </button>
                </div>

                <ClosePopupIcon onClick={closePopup} />
            </div>
        </dialog>
    );
};

export default MobileSearchPopup;
