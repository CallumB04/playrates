import { useCallback, useEffect, useId, useState } from "react";
import Modal from "../../ui/Modal";
import StepBar from "../../journey/StepBar";
import { ONBOARDING_POPUP } from "../../journey/popupWidth";
import { useMarkOnboarded } from "../../../hooks/queries/useProfiles";
import { setWelcomeOpen } from "../../../lib/welcomeOpen";
import { openSetupStep } from "../../../lib/setupSheet";
import {
    nextStep,
    stepFrom,
    TRACK_ICONS,
    TRACK_LABELS,
    trackIndex,
    type WelcomeStep,
} from "./steps";
import type { StepProps } from "./stepProps";
import YouStep from "./YouStep";
import GamesStep from "./GamesStep";
import RateStep from "./RateStep";
import TourStep from "./TourStep";
import DoneStep from "./DoneStep";

/** Where a reload picks up, for this tab. */
const KEY = "pr_welcome_step";
const stored = (): string | null => {
    try {
        return sessionStorage.getItem(KEY);
    } catch {
        return null;
    }
};
const store = (step: WelcomeStep | null) => {
    try {
        if (step) sessionStorage.setItem(KEY, step);
        else sessionStorage.removeItem(KEY);
    } catch {
        // Private browsing: a reload starts again, which is fine.
    }
};

/**
 * The welcome: a few short steps after signing up, in one popup that
 * keeps its size from step to step, with a bar across the top that starts
 * with signing up already done. Leaving, by any way out or by reaching
 * the end, marks it seen; whatever's left waits on home.
 */
const WelcomeFlow = ({
    preview = false,
    onClose,
}: {
    /** Walks it without saving a thing, for the admin preview. */
    preview?: boolean;
    onClose: () => void;
}) => {
    const titleId = useId();
    const [step, setStep] = useState<WelcomeStep>(() =>
        preview ? "you" : stepFrom(stored())
    );
    const { mutate: markOnboarded } = useMarkOnboarded();

    useEffect(() => {
        setWelcomeOpen(true);
        return () => setWelcomeOpen(false);
    }, []);

    useEffect(() => {
        if (preview) return;
        store(step);
        if (step === "done") markOnboarded();
    }, [step, preview, markOnboarded]);

    const close = useCallback(() => {
        if (!preview) {
            markOnboarded();
            store(null);
        }
        onClose();
    }, [preview, markOnboarded, onClose]);

    const onNext = useCallback(() => setStep(nextStep(step)), [step]);
    const props: StepProps = {
        titleId,
        preview,
        onNext,
        onPass: onNext,
        onLeave: close,
    };
    const done = step === "done" ? TRACK_LABELS.length : trackIndex(step);

    return (
        <Modal
            onClose={close}
            labelledBy={titleId}
            className={ONBOARDING_POPUP}
        >
            {/* As tall as the step needs, up to the screen, from a floor
                that stops the short ones looking lost. Only the middle of
                a long one scrolls. */}
            <div className="relative flex max-h-[calc(88dvh-2rem-1px)] min-h-[min(24rem,calc(88dvh-2rem-1px))] flex-col sm:max-h-[calc(90dvh-3rem-2px)] sm:min-h-[min(30rem,calc(90dvh-3rem-2px))]">
                <StepBar
                    label="Your welcome"
                    steps={TRACK_LABELS}
                    icons={TRACK_ICONS}
                    done={done}
                    className="mb-6 shrink-0 pr-12"
                />
                <div
                    key={step}
                    className="flex min-h-0 flex-1 animate-swap-in flex-col"
                >
                    {step === "you" && <YouStep {...props} />}
                    {step === "games" && <GamesStep {...props} />}
                    {step === "rate" && <RateStep {...props} />}
                    {step === "tour" && <TourStep {...props} />}
                    {step === "done" && (
                        <DoneStep
                            {...props}
                            onFinish={close}
                            // Out of the welcome to the real thing, in a
                            // sheet of its own.
                            onPick={(key) => {
                                close();
                                openSetupStep(key);
                            }}
                        />
                    )}
                </div>
                {preview && (
                    <p className="mt-3 shrink-0 text-center text-label-sm text-content-muted">
                        Preview. Nothing you enter here is saved.
                    </p>
                )}
            </div>
        </Modal>
    );
};

export default WelcomeFlow;
