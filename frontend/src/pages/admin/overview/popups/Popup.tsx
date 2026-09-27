import { useId, type ReactNode } from "react";
import Modal from "../../../../components/ui/Modal";
import { figureClass } from "../../../../components/ui/Figure";

/** Every overview popup opens the same way: what it is, the figure the card
 *  showed, and then the detail. A bottom sheet on a phone, like every Modal. */
const Popup = ({
    title,
    value,
    note,
    onClose,
    children,
}: {
    title: string;
    value?: ReactNode;
    note?: ReactNode;
    onClose: () => void;
    children: ReactNode;
}) => {
    const titleId = useId();
    return (
        <Modal
            onClose={onClose}
            labelledBy={titleId}
            className="w-full sm:max-w-2xl"
        >
            <div className="flex flex-col gap-7">
                <header className="pr-10">
                    <h2
                        id={titleId}
                        className="text-label text-content-secondary"
                    >
                        {title}
                    </h2>
                    {value !== undefined && (
                        <p className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                            <span className={figureClass("display")}>
                                {value}
                            </span>
                            {note && (
                                <span className="text-label text-content-muted">
                                    {note}
                                </span>
                            )}
                        </p>
                    )}
                </header>
                {children}
            </div>
        </Modal>
    );
};

/** A part of a popup: a label on a hairline, then its content. */
export const PopupSection = ({
    title,
    trailing,
    children,
}: {
    title: string;
    trailing?: ReactNode;
    children: ReactNode;
}) => (
    <section>
        <h3 className="mb-3 flex items-baseline justify-between gap-3 border-b border-subtle pb-2 text-label text-content-muted">
            {title}
            {trailing}
        </h3>
        {children}
    </section>
);

/** A band of figures, as a profile has them. */
export const PopupBand = ({ children }: { children: ReactNode }) => (
    <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
        {children}
    </div>
);

export default Popup;
