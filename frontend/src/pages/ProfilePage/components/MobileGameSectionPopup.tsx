import Modal from "../../../components/ui/Modal";

interface MobileGameSectionPopupProps {
    closePopup: () => void;
    selectSection: (section: string) => void;
    currentActiveSection: string;
}

const MobileGameSectionPopup: React.FC<MobileGameSectionPopupProps> = ({
    closePopup,
    selectSection,
    currentActiveSection,
}) => {
    // confirm friend removal and close popup
    const handleConfirm = (section: string) => {
        selectSection(section);
        closePopup();
    };

    return (
        <Modal
            onClose={closePopup}
            className="flex w-[min(450px,95vw)] flex-col gap-3 text-center"
        >
            <div className="contents">
                <h2 className="text-xl text-content">Select Section</h2>

                <div className="flex w-full flex-col justify-center gap-5 border-t border-t-subtle pt-3">
                    {["played", "playing", "backlog", "wishlist"].map(
                        (sectionName) => {
                            return (
                                <button
                                    key={sectionName}
                                    className={`${sectionName === currentActiveSection ? "button-primary" : "button-outline button-outline-default"} w-full`}
                                    onClick={() => handleConfirm(sectionName)}
                                    disabled={
                                        sectionName === currentActiveSection
                                    }
                                >
                                    <span className="font-light">
                                        {sectionName === currentActiveSection
                                            ? "Current: "
                                            : ""}
                                    </span>{" "}
                                    {sectionName[0].toUpperCase() +
                                        sectionName.slice(1)}
                                </button>
                            );
                        }
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default MobileGameSectionPopup;
