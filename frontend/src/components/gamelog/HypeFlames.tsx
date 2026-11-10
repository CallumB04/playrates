import { Flame } from "lucide-react";
import { HYPE_LEVELS, hypeLabel } from "./hype";
import { cn } from "../../lib/cn";

interface HypeFlamesProps {
    hype: number;
    size?: "sm" | "lg";
    className?: string;
}

/** How hyped someone is for a backlog game, to read rather than set. The
 *  unlit flames stay faintly drawn, so three reads as three of five. */
const HypeFlames = ({ hype, size = "sm", className }: HypeFlamesProps) => (
    <span
        role="img"
        aria-label={hypeLabel(hype)}
        className={cn("inline-flex items-center", className)}
    >
        {HYPE_LEVELS.map((level) => (
            <Flame
                key={level}
                aria-hidden
                strokeWidth={1.75}
                className={cn(
                    size === "lg" ? "size-6" : "size-3.5",
                    level <= hype
                        ? "fill-current text-accent"
                        : "text-content-muted/40"
                )}
            />
        ))}
    </span>
);

export default HypeFlames;
