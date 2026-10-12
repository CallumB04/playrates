import { useId } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronRight, X } from "lucide-react";
import { cardClass } from "../../../components/ui/Card";
import Progress from "../../../components/ui/Progress";
import { cn } from "../../../lib/cn";
import type { SetupStep } from "../lib/setupChecklist";

interface SetupChecklistProps {
    steps: SetupStep[];
    onDismiss: () => void;
}

/**
 * What is left before a profile is worth visiting. Done steps stay on the
 * list, ticked: seeing two of four already done is what pulls someone back
 * for the other two.
 */
const SetupChecklist = ({ steps, onDismiss }: SetupChecklistProps) => {
    const titleId = useId();
    const done = steps.filter((step) => step.done).length;

    return (
        <section aria-labelledby={titleId} className={cardClass("relative")}>
            <header className="flex items-start justify-between gap-4 pr-8">
                <div className="min-w-0">
                    <h2
                        id={titleId}
                        className="font-display text-section text-content"
                    >
                        Set up your profile
                    </h2>
                    <p className="mt-0.5 text-label text-content-muted">
                        {done} of {steps.length} done
                    </p>
                </div>
            </header>
            <button
                type="button"
                onClick={onDismiss}
                aria-label="Dismiss setup checklist"
                className="absolute top-2 right-2 flex size-11 items-center justify-center rounded-sm text-content-muted lift hover:text-content"
            >
                <X size={18} aria-hidden />
            </button>

            <Progress
                value={done / steps.length}
                label={`${done} of ${steps.length} setup steps done`}
                className="mt-3"
            />

            <ul className="mt-4 grid gap-1 sm:grid-cols-2">
                {steps.map((step) => (
                    <li key={step.key}>
                        <StepRow step={step} />
                    </li>
                ))}
            </ul>
        </section>
    );
};

const Mark = ({ done }: { done: boolean }) => (
    <span
        aria-hidden
        className={cn(
            "grid size-6 shrink-0 place-items-center rounded-full border",
            done
                ? "border-brand bg-brand text-content-on-solid"
                : "border-strong"
        )}
    >
        {done && <Check size={14} strokeWidth={3} />}
    </span>
);

const StepRow = ({ step }: { step: SetupStep }) => {
    if (step.done) {
        return (
            <span className="flex min-h-11 items-center gap-3 px-2.5 text-body-sm text-content-muted">
                <Mark done />
                <span className="line-through decoration-content-muted/60">
                    {step.label}
                </span>
                <span className="sr-only">(done)</span>
            </span>
        );
    }
    return (
        <Link
            to={step.to}
            className="group flex min-h-11 items-center gap-3 rounded-md px-2.5 text-body-sm font-medium text-content lift hover:bg-surface-hover"
        >
            <Mark done={false} />
            <span className="min-w-0 flex-1">{step.label}</span>
            <ChevronRight
                size={16}
                aria-hidden
                className="shrink-0 text-content-muted group-hover:text-content"
            />
        </Link>
    );
};

export default SetupChecklist;
