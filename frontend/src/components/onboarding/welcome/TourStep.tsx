import { useState } from "react";
import Button from "../../ui/Button";
import TourCards from "../../journey/TourCards";
import { useProgress } from "../../../hooks/queries/useProgress";
import StepFrame from "./StepFrame";
import type { StepProps } from "./stepProps";

const CARDS = 3;

/** How it all works, a card at a time, with their own figures in it. */
const TourStep = ({ titleId, onNext }: StepProps) => {
    const { data: progress } = useProgress();
    const [index, setIndex] = useState(0);
    const last = index === CARDS - 1;

    return (
        <StepFrame
            titleId={titleId}
            title="How PlayRates works"
            lead="Three things to know."
            onSkip={onNext}
            primary={
                <Button onClick={last ? onNext : () => setIndex(index + 1)}>
                    {last ? "Continue" : "Next"}
                </Button>
            }
        >
            <TourCards progress={progress} index={index} onIndex={setIndex} />
        </StepFrame>
    );
};

export default TourStep;
