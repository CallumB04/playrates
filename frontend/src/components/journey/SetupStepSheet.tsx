import { useId } from "react";
import type { SetupStepKey } from "@playrates/shared";
import Popup from "../ui/Popup";
import { useXpRules } from "../../hooks/queries/useProgress";
import { useSetupSteps } from "../../hooks/useSetupSteps";
import { ONBOARDING_POPUP } from "./popupWidth";
import SetupStepContent from "./SetupStepContent";
import { STEP_META, stepArtUrl } from "./setupStepMeta";
import XpLabel from "./XpLabel";

/** A setup step in a popup of its own, at the welcome's width, on the art
 *  its card shows on home. A bottom sheet on a phone, as every popup is. */
const SetupStepSheet = ({
    step,
    onClose,
}: {
    step: SetupStepKey;
    onClose: () => void;
}) => {
    const titleId = useId();
    const { title, blurb, xpSource } = STEP_META[step];
    const xp = useXpRules().data?.find((r) => r.source === xpSource)?.xp;
    const steps = useSetupSteps();
    const done = steps?.filter((s) => s.done).length;
    const where = steps && done !== undefined && (
        <span className="font-mono">
            {done}/{steps.length}
        </span>
    );

    return (
        <Popup
            onClose={onClose}
            titleId={titleId}
            width={ONBOARDING_POPUP}
            title={title}
            blurb={blurb}
            art={stepArtUrl(step)}
            eyebrow={
                <span className="inline-flex items-baseline gap-2">
                    <span>Get started {where}</span>
                    {xp !== undefined && (
                        <>
                            <span aria-hidden>·</span>
                            <XpLabel>+{xp} XP</XpLabel>
                        </>
                    )}
                </span>
            }
        >
            <SetupStepContent step={step} onDone={onClose} onSkip={onClose} />
        </Popup>
    );
};

export default SetupStepSheet;
