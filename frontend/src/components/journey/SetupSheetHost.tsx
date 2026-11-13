import { lazy, Suspense } from "react";
import { closeSetupStep, useSetupSheet } from "../../lib/setupSheet";

// Opened now and then, so never part of the page everyone loads.
const SetupStepSheet = lazy(() => import("./SetupStepSheet"));

/** Wherever a setup step's sheet is asked for, it opens here. */
const SetupSheetHost = () => {
    const step = useSetupSheet();
    if (!step) return null;
    return (
        <Suspense fallback={null}>
            <SetupStepSheet key={step} step={step} onClose={closeSetupStep} />
        </Suspense>
    );
};

export default SetupSheetHost;
