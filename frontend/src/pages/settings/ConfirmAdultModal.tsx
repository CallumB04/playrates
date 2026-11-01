import Modal from "../../components/ui/Modal";
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
    <Modal
        onClose={onCancel}
        labelledBy="confirm-adult-title"
        className="w-full max-w-md"
    >
        <h2
            id="confirm-adult-title"
            className="border-b border-subtle pb-3 font-display text-section text-content"
        >
            Are you 18 or over?
        </h2>
        <div className="flex flex-col gap-4 pt-4">
            <p className="text-body-sm text-content-secondary">
                Sexually explicit games are for adults only. Confirm you’re 18
                or over to show them.
            </p>
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
        </div>
    </Modal>
);

export default ConfirmAdultModal;
