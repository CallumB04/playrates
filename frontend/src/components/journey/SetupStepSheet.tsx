import { useId } from "react";
import type { SetupStepKey } from "@playrates/shared";
import Modal from "../ui/Modal";
import { ONBOARDING_POPUP } from "./popupWidth";
import SetupStepContent from "./SetupStepContent";

/** A setup step in a popup of its own, at the welcome's width. A bottom
 *  sheet on a phone, as every popup is. */
const SetupStepSheet = ({
    step,
    onClose,
}: {
    step: SetupStepKey;
    onClose: () => void;
}) => {
    const titleId = useId();
    return (
        <Modal
            onClose={onClose}
            labelledBy={titleId}
            className={ONBOARDING_POPUP}
        >
            <SetupStepContent
                step={step}
                titleId={titleId}
                onDone={onClose}
                onSkip={onClose}
            />
        </Modal>
    );
};

export default SetupStepSheet;
