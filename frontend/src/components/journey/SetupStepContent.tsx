import type { ComponentType } from "react";
import type { SetupStepKey } from "@playrates/shared";
import { useXpRules } from "../../hooks/queries/useProgress";
import { useSetupSteps } from "../../hooks/useSetupSteps";
import { STEP_META } from "./setupStepMeta";
import XpLabel from "./XpLabel";
import type { SheetBodyProps } from "./sheets/sheetProps";
import { BioBody, PictureBody } from "./sheets/ProfileBodies";
import {
    FavouritesBody,
    LogBody,
    RateBody,
    ReviewBody,
} from "./sheets/GameBodies";
import { FriendBody, PostBody } from "./sheets/PeopleBodies";

const BODIES: Record<SetupStepKey, ComponentType<SheetBodyProps>> = {
    picture: PictureBody,
    bio: BioBody,
    log: LogBody,
    rate: RateBody,
    review: ReviewBody,
    favourites: FavouritesBody,
    friend: FriendBody,
    post: PostBody,
};

/**
 * One setup step, done where you are: what it is in a line, what it's
 * worth, and the thing itself, with Skip for now always there.
 */
const SetupStepContent = ({
    step,
    titleId,
    onDone,
    onSkip,
}: SheetBodyProps & { step: SetupStepKey; titleId: string }) => {
    const { title, blurb, xpSource } = STEP_META[step];
    const xp = useXpRules().data?.find((r) => r.source === xpSource)?.xp;
    const steps = useSetupSteps();
    const done = steps?.filter((s) => s.done).length;
    const Body = BODIES[step];

    return (
        <div className="flex flex-1 flex-col gap-5">
            {/* Where it sits in setup and what it's worth, over the thing
                to do, said plainly. */}
            <div className="pr-10">
                <p className="flex items-baseline gap-2 text-label-sm text-content-muted">
                    <span>
                        Get started
                        {done !== undefined && steps && (
                            <span className="font-mono">
                                {" "}
                                {done}/{steps.length}
                            </span>
                        )}
                    </span>
                    {xp !== undefined && (
                        <>
                            <span aria-hidden>·</span>
                            <XpLabel>+{xp} XP</XpLabel>
                        </>
                    )}
                </p>
                <h2
                    id={titleId}
                    className="mt-1 font-display text-[24px] leading-tight text-content sm:text-[28px]"
                >
                    {title}
                </h2>
                <p className="mt-1 text-body-sm text-content-secondary">
                    {blurb}
                </p>
            </div>
            <Body onDone={onDone} onSkip={onSkip} />
        </div>
    );
};

export default SetupStepContent;
