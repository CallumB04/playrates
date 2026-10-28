import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { SETUP_REWARD } from "@playrates/shared";
import Progress from "../ui/Progress";
import { TokenCoin } from "../progress/TokenAmount";
import { cn } from "../../lib/cn";
import type { SetupStep } from "../../lib/setupChecklist";

export const MENU_ITEM =
    "flex min-h-11 w-full items-center gap-2.5 rounded-sm px-2.5 py-2.5 text-left text-body-sm leading-none text-content-secondary transition-colors hover:bg-surface-hover hover:text-content sm:min-h-0";

/** How far along setup is, drawn as an arc where a chevron would sit. */
export const ProgressRing = ({ share }: { share: number }) => {
    const radius = 6.5;
    const length = 2 * Math.PI * radius;
    return (
        <svg
            aria-hidden
            viewBox="0 0 16 16"
            className="size-4 shrink-0 -rotate-90"
        >
            <circle
                cx="8"
                cy="8"
                r={radius}
                fill="none"
                strokeWidth="2.5"
                className="stroke-subtle"
            />
            <circle
                cx="8"
                cy="8"
                r={radius}
                fill="none"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={`${share * length} ${length}`}
                className="stroke-brand"
            />
        </svg>
    );
};

/** The steps themselves, with a bar and a count. Done steps stay, ticked:
 *  two of four already done is the pull to finish the other two. */
export const SetupSteps = ({
    steps,
    done,
    onNavigate,
    itemRole,
}: {
    steps: SetupStep[];
    done: number;
    onNavigate: () => void;
    /** "menuitem" inside the account menu; plain links anywhere else. */
    itemRole?: "menuitem";
}) => (
    <>
        <p className="mx-2.5 mt-1 text-label text-content-muted">
            <span className="font-mono text-content">
                {Math.round((done / steps.length) * 100)}%
            </span>{" "}
            complete
        </p>
        <Progress
            value={done / steps.length}
            size="sm"
            label={`${done} of ${steps.length} setup steps done`}
            className="mx-2.5 mt-1.5 mb-1.5"
        />
        <p className="mx-2.5 mb-1.5 inline-flex items-center gap-1 text-label-sm text-content-muted">
            All done: +{SETUP_REWARD.xp} XP and {SETUP_REWARD.tokens}
            <TokenCoin className="size-3" />
        </p>
        <ul>
            {steps.map((step) => (
                <li key={step.key}>
                    {step.done ? (
                        // Not a control, so it needs no 44px.
                        <span className="flex min-h-8 items-center gap-2.5 px-2.5 text-body-sm text-content-muted line-through decoration-content-muted/60">
                            <Check
                                size={15}
                                aria-hidden
                                className="shrink-0 text-brand"
                            />
                            {step.label}
                            <span className="sr-only">(done)</span>
                        </span>
                    ) : (
                        <Link
                            to={step.to}
                            onClick={onNavigate}
                            role={itemRole}
                            className={cn(MENU_ITEM, "sm:min-h-8 sm:py-1.5")}
                        >
                            <span
                                aria-hidden
                                className="size-[15px] shrink-0 rounded-full border-[1.5px] border-strong"
                            />
                            {step.label}
                        </Link>
                    )}
                </li>
            ))}
        </ul>
    </>
);
