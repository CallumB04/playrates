import { cn } from "../../lib/cn";

/**
 * Sized to the avatar it sits on, not to the caller's guess.
 */
const DOT_SIZE = {
    sm: "size-2.5 border-2",
    lg: "size-3 border-2 sm:size-3.5 sm:border-[3px] lg:size-4",
} as const;

export type PresenceDotSize = keyof typeof DOT_SIZE;

interface PresenceDotProps {
    online: boolean;
    size?: PresenceDotSize;
    className?: string;
}

/**
 * The online badge on an avatar. Expects a `relative` wrapper.
 *
 * Avatars are circles, but their box is a square, so pinning the dot to the
 * corner leaves it floating off the edge — by a margin that grows with the
 * avatar, which is why it read as a stray mark on the profile hero and as
 * nothing much on a friend row. 85.36% is where a circle actually passes
 * through its own box on the diagonal, so the dot sits on the rim at every
 * size.
 */
const PresenceDot = ({ online, size = "sm", className }: PresenceDotProps) => (
    <span
        className={cn(
            "absolute bottom-[14.64%] right-[14.64%] translate-x-1/2 translate-y-1/2 rounded-full border-surface-raised",
            DOT_SIZE[size],
            online ? "bg-success" : "bg-content-muted",
            className
        )}
        title={online ? "Online" : "Offline"}
    />
);

export default PresenceDot;
