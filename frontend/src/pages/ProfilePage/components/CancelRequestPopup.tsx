import { UserRoundX } from "lucide-react";
import ConfirmPopup from "../../../components/ui/ConfirmPopup";

interface CancelRequestPopupProps {
    closePopup: () => void;
    confirmCancel: () => Promise<void>;
    username: string;
}

/** Taking back a request you sent, which is not the same as unfriending. */
const CancelRequestPopup = ({
    closePopup,
    confirmCancel,
    username,
}: CancelRequestPopupProps) => (
    <ConfirmPopup
        title="Cancel friend request"
        icon={UserRoundX}
        confirmLabel="Cancel request"
        body={
            <>
                <span className="font-medium text-content">{username}</span>{" "}
                will no longer see your request. You can send another one
                whenever you like.
            </>
        }
        onConfirm={() => {
            void confirmCancel();
            closePopup();
        }}
        onClose={closePopup}
    />
);

export default CancelRequestPopup;
