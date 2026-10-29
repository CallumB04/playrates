import { cn } from "../../lib/cn";

interface LevelChipProps {
    level: number;
    className?: string;
}

/** A level as a small number in a ring, tucked against an avatar. Quiet:
 *  it's a detail of the picture, not a label beside it. */
const LevelChip = ({ level, className }: LevelChipProps) => (
    <span
        className={cn(
            "inline-grid h-4 min-w-4 place-items-center rounded-full bg-surface-raised px-1 font-mono text-[9.5px] leading-none font-bold text-content tabular-nums ring-1 ring-strong",
            className
        )}
        aria-label={`Level ${level}`}
    >
        <span aria-hidden>{level}</span>
    </span>
);

export default LevelChip;
