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
    /** The game art behind its card and its popup: an IGDB image chosen
     *  for what the step asks, so it reads the same every day. */
    art: string;
}

/** An IGDB image at a size `igdbSized` can swap. */
export const stepArtUrl = (key: SetupStepKey): string =>
    `https://images.igdb.com/igdb/image/upload/t_screenshot_big/${STEP_META[key].art}.jpg`;

/** Each setup step as its sheet says it. The checklist's own labels are
 *  in lib/setupChecklist.ts. */
export const STEP_META: Record<SetupStepKey, StepMeta> = {
    picture: {
        icon: Camera,
        title: "Add a profile picture",
        blurb: "Shown beside everything you post.",
        xpSource: "avatar",
        // Life Is Strange: Max’s wall of photos.
        art: "nw8gupltr8pejuf0wlbs",
    },
    bio: {
        icon: TextQuote,
        title: "Write a bio",
        blurb: "A line about what you play.",
        xpSource: "bio",
        // Disco Elysium: working out who you are.
        art: "sc8v3m",
    },
    log: {
        icon: Gamepad2,
        title: "Log your first game",
        blurb: "Start your shelves with one you’ve played.",
        xpSource: "play",
        // Pokémon Legends: Arceus: filling in the first Pokédex.
        art: "sc93am",
    },
    rate: {
        icon: Star,
        title: "Rate a game",
        blurb: "Out of 10, in halves.",
        xpSource: "rate",
        // Guitar Hero III: the Rock Meter grades every song.
        art: "xxheu0ffo2vhdtbmomkq",
    },
    review: {
        icon: PenLine,
        title: "Write your first review",
        blurb: "Any length counts.",
        xpSource: "review_short",
        // Alan Wake II: a writer.
        art: "scmnco",
    },
    favourites: {
        icon: Heart,
        title: "Add favourite games",
        blurb: "Up to six, at the top of your profile.",
        xpSource: "favourites",
        // Stardew Valley: everyone’s favourite.
        art: "rhxs1x9w5hf5kde2osf5",
    },
    friend: {
        icon: UserPlus,
        title: "Add a friend",
        blurb: "Ticks off once they accept.",
        xpSource: "friend",
        // It Takes Two: made for two.
        art: "sc8cg6",
    },
    post: {
        icon: MessageSquare,
        title: "Post in the community",
        blurb: "Start a conversation, or reply to one.",
        xpSource: "thread",
        // Sea of Thieves: a crew together.
        art: "sc87lo",
    },
};
