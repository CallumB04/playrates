import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { SETUP_REWARD } from "@playrates/shared";
import { ProgressRing } from "../../../components/layout/SetupSteps";
import { TokenCoin } from "../../../components/progress/TokenAmount";
import { cardClass } from "../../../components/ui/cardClass";
import { useSetupSteps } from "../../../hooks/useSetupSteps";
import { unfinished } from "../../../lib/setupChecklist";

/**
 * Setup, on home until it's finished: one slim row that is itself the way
 * to the next step, so the step is what it says first and the arrow beside
 * it moves with the pointer. The full list stays in the account menu and
 * More.
 */
const GetStarted = () => {
    const steps = unfinished(useSetupSteps());
    const next = steps?.find((step) => !step.done);
    if (!steps || !next) return null;
    const done = steps.filter((step) => step.done).length;

    return (
        <Link
            to={next.to}
            className={cardClass(
                "group flex animate-fade-up items-center gap-3 px-4 py-3 transition-colors hover:border-strong hover:bg-surface-hover sm:gap-3.5 sm:px-5",
                { padding: "none" }
            )}
        >
            <ProgressRing share={done / steps.length} large />
            <span className="min-w-0 flex-1">
                <span className="block text-label-sm text-content-muted">
                    Get started{" "}
                    <span className="font-mono">
                        {done}/{steps.length}
                    </span>
                    <span className="sr-only"> steps done. Next:</span>
                </span>
                <span className="mt-0.5 flex items-center gap-1.5 text-body-sm font-medium text-content">
                    <span className="truncate">{next.label}</span>
                    <ArrowRight
                        size={15}
                        aria-hidden
                        className="shrink-0 text-brand-text transition-transform duration-200 group-hover:translate-x-1"
                    />
                </span>
            </span>
            <span className="hidden shrink-0 items-center gap-1 text-label-sm text-content-muted sm:flex">
                All done: +{SETUP_REWARD.xp} XP and {SETUP_REWARD.tokens}
                <TokenCoin className="size-3" />
            </span>
        </Link>
    );
};

export default GetStarted;
