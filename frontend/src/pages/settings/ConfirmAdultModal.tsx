import Popup from "../../components/ui/Popup";
import Button from "../../components/ui/Button";

/** Asked once, before sexually explicit games first show: accounts are
 *  open from 13. The answer and when it was given are kept. */
const ConfirmAdultModal = ({
    onConfirm,
    onCancel,
}: {
    onConfirm: () => void;
    onCancel: () => void;
}) => (
    <Popup
        onClose={onCancel}
        titleId="confirm-adult-title"
        width="w-full sm:max-w-md"
        title="Are you 18 or over?"
        blurb={
            <p>
                Sexually explicit games are for adults only. Confirm you’re 18
                or over to show them.
            </p>
        }
        footer={
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                    variant="secondary"
                    className="w-full sm:w-auto"
                    onClick={onCancel}
                >
                    Cancel
                </Button>
                <Button className="w-full sm:w-auto" onClick={onConfirm}>
                    I’m 18 or over
                </Button>
            </div>
        }
    />
);

export default ConfirmAdultModal;
