import { useState } from "react";
import Button from "../../ui/Button";
import RateRows from "../../journey/RateRows";
import { useXpRules } from "../../../hooks/queries/useProgress";
import { formatCount } from "../../../lib/format";
import StepFrame from "./StepFrame";
import { xpFor, type StepProps } from "./stepProps";

/** Ratings for the games they've just said they played. Passed straight
 *  over when there's nothing unrated to ask about. */
const RateStep = ({ titleId, preview, onNext, onPass }: StepProps) => {
    const rateXp = xpFor(useXpRules().data, "rate");
    const [rated, setRated] = useState(0);

    return (
        <StepFrame
            titleId={titleId}
            title="Add your ratings"
            lead="Out of 10, in halves."
            reward={
                rateXp
                    ? rated > 0
                        ? `+${formatCount(rated * rateXp)} XP`
                        : `+${rateXp} XP each`
                    : undefined
            }
            onSkip={onNext}
            primary={<Button onClick={onNext}>Continue</Button>}
        >
            <RateRows preview={preview} onRated={setRated} onEmpty={onPass} />
        </StepFrame>
    );
};

export default RateStep;
