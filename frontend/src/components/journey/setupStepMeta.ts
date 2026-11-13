import {
    Camera,
    Gamepad2,
    Heart,
    MessageSquare,
    PenLine,
    Star,
    TextQuote,
    UserPlus,
    type LucideIcon,
} from "lucide-react";
import type { SetupStepKey } from "@playrates/shared";

interface StepMeta {
    icon: LucideIcon;
    /** The sheet's heading: the thing to do, said plainly. */
    title: string;
    /** How it works, in a line. */
    blurb: string;
    /** The XP rule doing it pays, so the figure shown is the server's. */
    xpSource: string;
}

/** Each setup step as its sheet says it. The checklist's own labels are
 *  in lib/setupChecklist.ts. */
export const STEP_META: Record<SetupStepKey, StepMeta> = {
    picture: {
        icon: Camera,
        title: "Add a profile picture",
        blurb: "Shown beside everything you post.",
        xpSource: "avatar",
    },
    bio: {
        icon: TextQuote,
        title: "Write a bio",
        blurb: "A line about what you play.",
        xpSource: "bio",
    },
    log: {
        icon: Gamepad2,
        title: "Log your first game",
        blurb: "Start your shelves with one you’ve played.",
        xpSource: "play",
    },
    rate: {
        icon: Star,
        title: "Rate a game",
        blurb: "Out of 10, in halves.",
        xpSource: "rate",
    },
    review: {
        icon: PenLine,
        title: "Write your first review",
        blurb: "Any length counts.",
        xpSource: "review_short",
    },
    favourites: {
        icon: Heart,
        title: "Add favourite games",
        blurb: "Up to six, at the top of your profile.",
        xpSource: "favourites",
    },
    friend: {
        icon: UserPlus,
        title: "Add a friend",
        blurb: "Ticks off once they accept.",
        xpSource: "friend",
    },
    post: {
        icon: MessageSquare,
        title: "Post in the community",
        blurb: "Start a conversation, or reply to one.",
        xpSource: "thread",
    },
};
