import { igdbSized } from "@playrates/shared";
import { cn } from "../../lib/cn";

/* Whole class strings, so the stylesheet keeps them. */
const FADES = {
    // Solid behind the words on a wide card, thinning to the right; on a
    // phone, down the card.
    side: "bg-linear-to-b from-surface-raised/70 via-surface-raised/88 via-55% to-surface-raised/95 sm:bg-linear-to-r sm:from-surface-raised sm:from-30% sm:via-surface-raised/82 sm:via-60% sm:to-surface-raised/45",
    // Down the card at every width, for one too narrow to give the art a
    // side of its own.
    down: "bg-linear-to-b from-surface-raised/70 via-surface-raised/88 via-55% to-surface-raised/95",
};

/**
 * A game's own art behind a card, as Now playing has it: near full
 * strength, so it keeps its colour, with the card's surface laid over it
 * where the words are.
 */
const ArtBackdrop = ({
    url,
    fade = "side",
}: {
    url: string | null | undefined;
    fade?: keyof typeof FADES;
}) =>
    url ? (
        <span aria-hidden className="pointer-events-none absolute inset-0">
            <img
                src={igdbSized(url, "screenshot_big")}
                alt=""
                loading="lazy"
                decoding="async"
                className="size-full animate-fade-up object-cover"
            />
            <span className={cn("absolute inset-0", FADES[fade])} />
        </span>
    ) : null;

export default ArtBackdrop;
