import { cn } from "../../lib/cn";

/** Sized to the avatar it sits on, not to the caller's guess. */
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
 * The online badge on an avatar. Expects a `relative` wrapper. 85.36% is where
 * a circle crosses its own square box on the diagonal, so the dot sits on the
 * rim at every size rather than floating off the corner.
 */
const PresenceDot = ({ online, size = "sm", className }: PresenceDotProps) => (
    <span
        className={cn(
            "absolute right-[14.64%] bottom-[14.64%] translate-x-1/2 translate-y-1/2 rounded-full border-surface-raised",
            DOT_SIZE[size],
            online ? "bg-success" : "bg-content-muted",
            className
        )}
        title={online ? "Online" : "Offline"}
    />
);

export default PresenceDot;
