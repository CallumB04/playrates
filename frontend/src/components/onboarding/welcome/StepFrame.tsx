import type { ReactNode } from "react";
import Button from "../../ui/Button";
import XpLabel from "../../journey/XpLabel";

interface StepFrameProps {
    titleId: string;
    title: string;
    lead?: ReactNode;
    /** Held under the heading as the rest scrolls: a search, a tip. */
    pinned?: ReactNode;
    children?: ReactNode;
    /** What doing it is worth, said beside the way on. */
    reward?: ReactNode;
    /** The way on: Continue, or what this step's Continue does. */
    primary: ReactNode;
    /** "Skip for now": it waits on home, so it's never gone for good. */
    onSkip?: () => void;
    busy?: boolean;
}

/**
 * One step of the welcome, filling the popup: one question and a line
 * under it at the top, the way on at the foot, and only what's between
 * them scrolling, so neither ever goes out of reach.
 */
const StepFrame = ({
    titleId,
    title,
    lead,
    pinned,
    children,
    reward,
    primary,
    onSkip,
    busy = false,
}: StepFrameProps) => (
    <div className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0">
            <h2
                id={titleId}
                className="font-display text-[22px] leading-tight text-content sm:text-[26px]"
            >
                {title}
            </h2>
            {lead && (
                <p className="mt-1.5 text-body-sm text-content-secondary">
                    {lead}
                </p>
            )}
            {pinned && <div className="mt-4 flex flex-col gap-3">{pinned}</div>}
        </div>
        {/* Room round the edge for a ring on what's chosen, which the
            scroll would otherwise clip. */}
        <div className="-mx-4 mt-4 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-4 pt-1 pb-4 sm:-mx-6 sm:px-6">
            {children}
        </div>
        <div className="-mx-4 -mb-4 flex shrink-0 items-center gap-2 border-t border-subtle px-4 pt-3 pb-[calc(--spacing(3)+env(safe-area-inset-bottom))] sm:-mx-6 sm:-mb-6 sm:px-6 sm:py-4">
            <XpLabel className="mr-auto">{reward}</XpLabel>
            {onSkip && (
                <Button
                    variant="ghost"
                    onClick={onSkip}
                    disabled={busy}
                    className="max-sm:min-h-11 max-sm:px-3"
                >
                    Skip for now
                </Button>
            )}
            {primary}
        </div>
    </div>
);

export default StepFrame;
