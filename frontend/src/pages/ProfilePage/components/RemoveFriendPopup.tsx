import { UserMinus } from "lucide-react";
import ConfirmPopup from "../../../components/ui/ConfirmPopup";

interface RemoveFriendPopupProps {
    closePopup: () => void;
    confirmRemove: () => Promise<void>;
    friendName: string;
}

const RemoveFriendPopup = ({
    closePopup,
    confirmRemove,
    friendName,
}: RemoveFriendPopupProps) => (
    <ConfirmPopup
        title="Remove friend"
        icon={UserMinus}
        confirmLabel="Remove"
        body={
            <>
                You and{" "}
                <span className="font-medium text-content">{friendName}</span>{" "}
                will stop seeing each other&rsquo;s activity. You can send a new
                request later.
            </>
        }
        onConfirm={() => {
            void confirmRemove();
            closePopup();
        }}
        onClose={closePopup}
    />
);

export default RemoveFriendPopup;
