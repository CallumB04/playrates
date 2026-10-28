import { REACTIONS } from "@playrates/shared";
import { cn } from "../../lib/cn";
import { REACTION_COLOURS, REACTION_ICONS } from "./reactionIcons";

interface ReactionIconProps {
    reaction: string;
    size?: number;
    /** In the page's own grey, for one that's locked. */
    muted?: boolean;
    className?: string;
}

/** A reaction as its own glyph: drawn in its colour, filled with a wash of
 *  it, the way an emoji carries its colour with it. */
const ReactionIcon = ({
    reaction,
    size = 16,
    muted = false,
    className,
}: ReactionIconProps) => {
    const def = REACTIONS.find((r) => r.key === reaction);
    const Icon = REACTION_ICONS[def?.icon ?? "ArrowBigUp"]!;
    const colour = REACTION_COLOURS[reaction] ?? "var(--brand)";
    return (
        <Icon
            size={size}
            strokeWidth={2.25}
            aria-hidden
            className={cn("shrink-0", muted && "text-content-muted", className)}
            style={
                muted
                    ? undefined
                    : {
                          color: colour,
                          fill: `color-mix(in srgb, ${colour} 28%, transparent)`,
                      }
            }
        />
    );
};

export default ReactionIcon;
