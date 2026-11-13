import type { ComponentType } from "react";
import type { SetupStepKey } from "@playrates/shared";
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

/** One setup step's body: the thing itself, with Skip for now always
 *  there. Its heading is the popup's. */
const SetupStepContent = ({
    step,
    onDone,
    onSkip,
}: SheetBodyProps & { step: SetupStepKey }) => {
    const Body = BODIES[step];
    return (
        <div className="flex flex-1 flex-col gap-5">
            <Body onDone={onDone} onSkip={onSkip} />
        </div>
    );
};

export default SetupStepContent;
