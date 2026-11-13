import { useId, useState } from "react";
import { Compass } from "lucide-react";
import Button from "../ui/Button";
import Modal from "../ui/Modal";
import { useProgress } from "../../hooks/queries/useProgress";
import { cn } from "../../lib/cn";
import TourCards from "./TourCards";
import { ONBOARDING_POPUP } from "./popupWidth";

/** The welcome's tour again, for anyone who skipped it or wants a
 *  reminder: the same three cards, in a popup. */
const TourButton = ({ className }: { className?: string }) => {
    const [open, setOpen] = useState(false);
    const [index, setIndex] = useState(0);
    const titleId = useId();
    const { data: progress } = useProgress();

    return (
        <>
            <button
                type="button"
                onClick={() => {
                    setIndex(0);
                    setOpen(true);
                }}
                className={cn(
                    "relative inline-flex cursor-pointer items-center gap-1.5 text-label font-medium text-brand-text before:absolute before:-inset-x-1 before:-inset-y-3 before:content-[''] hover:underline",
                    className
                )}
            >
                <Compass size={14} aria-hidden />
                How PlayRates works
            </button>
            {open && (
                <Modal
                    onClose={() => setOpen(false)}
                    labelledBy={titleId}
                    className={ONBOARDING_POPUP}
                >
                    <div className="flex flex-col gap-4">
                        <h2
                            id={titleId}
                            className="pr-10 font-display text-section text-content"
                        >
                            How PlayRates works
                        </h2>
                        <TourCards
                            progress={progress}
                            index={index}
                            onIndex={setIndex}
                        />
                        <Button
                            onClick={() =>
                                index < 2 ? setIndex(index + 1) : setOpen(false)
                            }
                            className="w-full sm:w-auto sm:self-end"
                        >
                            {index < 2 ? "Next" : "Done"}
                        </Button>
                    </div>
                </Modal>
            )}
        </>
    );
};

export default TourButton;
