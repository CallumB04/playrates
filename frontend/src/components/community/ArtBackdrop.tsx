import { igdbSized } from "@playrates/shared";
import { cn } from "../../lib/cn";

/* How much of the art shows, place by place, as a mask on the art itself:
   it fades into the card's own surface. Whole class strings, so the
   stylesheet keeps them. */
const FADES = {
    // Faint behind the words on a wide card, stronger to the right; on a
    // phone, fading down the card.
    side: "[mask-image:linear-gradient(to_bottom,rgb(0_0_0/0.3),rgb(0_0_0/0.12)_55%,rgb(0_0_0/0.05))] sm:[mask-image:linear-gradient(to_right,transparent_30%,rgb(0_0_0/0.18)_60%,rgb(0_0_0/0.55))]",
    // Down the card at every width, for one too narrow to give the art a
    // side of its own. Gone at the foot, where the figures sit.
    down: "[mask-image:linear-gradient(to_bottom,rgb(0_0_0/0.3),rgb(0_0_0/0.1)_50%,transparent)]",
    // A row's right-hand end at every width: a row is too short to fade
    // down, and its words start at the left.
    row: "[mask-image:linear-gradient(to_right,transparent_40%,rgb(0_0_0/0.14)_72%,rgb(0_0_0/0.3))]",
};

/**
 * A game's own art behind a card, as Now playing has it, fading into the
 * card where the words are. A mask on the art rather than a veil over it:
 * two layers clipped to the same rounded corner each smooth its edge on
 * their own, and the art showed round the curve as a light patch.
 *
 * It sits under everything else in the card, so the card needs only
 * `relative isolate overflow-hidden`, and its contents nothing at all.
 */
const ArtBackdrop = ({
    url,
    fade = "side",
}: {
    url: string | null | undefined;
    fade?: keyof typeof FADES;
}) =>
    url ? (
        <span
            aria-hidden
            className={cn(
                "pointer-events-none absolute inset-0 -z-10",
                FADES[fade]
            )}
        >
            <img
                src={igdbSized(url, "screenshot_big")}
                alt=""
                loading="lazy"
                decoding="async"
                className="size-full animate-fade-up object-cover"
            />
        </span>
    ) : null;

export default ArtBackdrop;
