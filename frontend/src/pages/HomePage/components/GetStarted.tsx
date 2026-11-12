import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { SETUP_REWARD } from "@playrates/shared";
import { ProgressRing } from "../../../components/layout/SetupSteps";
import { TokenCoin } from "../../../components/progress/TokenAmount";
import { buttonClass } from "../../../components/ui/buttonClass";
import { cardClass } from "../../../components/ui/cardClass";
import { useSetupSteps } from "../../../hooks/useSetupSteps";
import { unfinished } from "../../../lib/setupChecklist";
import { cn } from "../../../lib/cn";

/* Drawn as a button, and lit with the row, so the whole row reads as the
   way to the step it names. Not a button itself: it sits in the link. */
const NEXT = "group-hover:-translate-y-px group-hover:bg-surface-hover";

/**
 * Setup, on home until it's finished: how far along, and the next step.
 * One slim row, so it never pushes what's on the go down the page; the
 * full list stays in the account menu and More.
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
                "group flex animate-fade-up items-center gap-3 px-4 py-2.5 transition-colors hover:border-strong sm:gap-3.5 sm:px-5",
                { padding: "none" }
            )}
        >
            <ProgressRing share={done / steps.length} large />
            <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-2 text-body-sm font-medium text-content">
                    Get started{" "}
                    <span className="font-mono text-label-sm font-normal text-content-muted">
                        {done}/{steps.length}
                    </span>{" "}
                    <span className="sr-only">steps done.</span>
                </span>
                {/* Shown on the button from a phone's width up, and still
                    said there, as the button is only drawn. */}
                <span className="mt-0.5 block truncate text-label-sm text-content-secondary sm:sr-only">
                    Next: {next.label}
                </span>
                <span className="mt-0.5 hidden items-center gap-1 text-label-sm text-content-muted sm:flex">
                    All done: +{SETUP_REWARD.xp} XP and {SETUP_REWARD.tokens}
                    <TokenCoin className="size-3" />
                </span>
            </span>
            <span
                aria-hidden
                className={buttonClass(
                    "secondary",
                    cn("shrink-0 max-sm:size-11 max-sm:px-0", NEXT),
                    "sm"
                )}
            >
                <span className="max-sm:hidden">{next.label}</span>
                <ArrowRight size={14} />
            </span>
        </Link>
    );
};

export default GetStarted;
