import { EyeOff } from "lucide-react";
import { cn } from "../../lib/cn";

/** Where an adult game's cover would be, for someone who hasn't chosen to
 *  see them. The place is kept so a count and an order still add up. */
export const HiddenCover = ({ className }: { className?: string }) => (
    <span
        aria-hidden
        className={cn(
            "grid place-items-center rounded-xs border border-dashed border-strong bg-surface-sunken text-content-muted",
            className
        )}
    >
        <EyeOff size={16} />
    </span>
);

/** A shelf tile with nothing of the game on it. Not a link: its page is
 *  missing to whoever sees this. */
const HiddenGameTile = () => (
    <div className="flex aspect-3/4 flex-col items-center justify-center gap-2 rounded-md border border-dashed border-strong bg-surface-sunken p-3 text-center">
        <EyeOff size={20} aria-hidden className="text-content-muted" />
        <p className="flex flex-col text-label-sm">
            <span className="font-medium text-content-secondary">
                Adult game
            </span>
            <span className="text-content-muted">Hidden</span>
        </p>
    </div>
);

export default HiddenGameTile;
