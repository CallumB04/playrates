import type { ReactNode } from "react";
import Button from "../../ui/Button";

/** The foot of a setup sheet: put it off, or do it. */
const SheetActions = ({
    onSkip,
    children,
}: {
    onSkip: () => void;
    children: ReactNode;
}) => (
    // At the foot of whatever holds it, as the welcome's own steps are.
    <div className="mt-auto flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onSkip} className="w-full sm:w-auto">
            Skip for now
        </Button>
        {children}
    </div>
);

export default SheetActions;
