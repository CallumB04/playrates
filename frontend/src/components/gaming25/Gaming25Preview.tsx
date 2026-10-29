import { Link } from "react-router-dom";
import { ArrowRight, Crown, Heart, Plus } from "lucide-react";
import {
    GAMING_25_CENTRE,
    GAMING_25_SIZE,
    type Gaming25Pick,
} from "@playrates/shared";
import { Skeleton } from "../ui/Skeleton";
import { cardClass } from "../ui/Card";
import GameCover from "../game/GameCover";
import { useGaming25 } from "../../hooks/queries/useGaming25";
import { formatCount } from "../../lib/format";
import { gaming25Path } from "../../lib/profilePaths";
import { cn } from "../../lib/cn";

interface Gaming25PreviewProps {
    username: string;
    canSee: boolean;
    isOwner: boolean;
}

const CARD = cardClass(
    "group relative flex items-center gap-4 overflow-hidden p-4 lift " +
        "hover:-translate-y-px hover:border-brand/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
    { padding: "none", tone: "feature" }
);

/* The back two lean out from behind the front one, a hand of cards. */
const BEHIND = ["left-1 top-3 -rotate-12", "right-1 top-3 rotate-12"] as const;

/** Three covers fanned, the favourite game in front; dashed outlines with
 *  a plus where there's nothing picked yet. */
const Fan = ({
    front,
    behind,
}: {
    front: Gaming25Pick | null;
    behind: (Gaming25Pick | null)[];
}) => (
    <span aria-hidden className="relative h-24 w-28 shrink-0">
        {BEHIND.map((place, i) => {
            const pick = behind[i];
            return (
                <span
                    key={place}
                    className={cn(
                        "absolute w-13 overflow-hidden rounded-xs shadow-plate transition-transform duration-200",
                        place,
                        i === 0
                            ? "group-hover:-translate-x-0.5 group-hover:-rotate-15"
                            : "group-hover:translate-x-0.5 group-hover:rotate-15"
                    )}
                >
                    {pick ? (
                        <GameCover
                            coverUrl={pick.game.coverUrl}
                            title=""
                            className="aspect-3/4 w-full opacity-80"
                        />
                    ) : (
                        <span className="block aspect-3/4 w-full rounded-xs border border-dashed border-strong bg-surface-raised" />
                    )}
                </span>
            );
        })}
        <span className="absolute top-0 left-1/2 z-10 w-15 -translate-x-1/2">
            {front ? (
                <GameCover
                    coverUrl={front.game.coverUrl}
                    title=""
                    className={cn(
                        "aspect-3/4 w-full rounded-xs shadow-lifted",
                        front.category === GAMING_25_CENTRE &&
                            "ring-2 ring-medal-gold"
                    )}
                />
            ) : (
                <span className="grid aspect-3/4 w-full place-items-center rounded-xs border border-dashed border-brand bg-surface-raised text-brand shadow-lifted">
                    <Plus size={18} />
                </span>
            )}
            {front?.category === GAMING_25_CENTRE && (
                <span className="absolute -top-2 left-1/2 grid size-5 -translate-x-1/2 place-items-center rounded-full bg-medal-gold text-surface-raised shadow-plate">
                    <Crown size={11} strokeWidth={2.5} />
                </span>
            )}
        </span>
    </span>
);

/** The card's heading, pointing on to the grid. */
const Heading = ({ children }: { children: string }) => (
    <span className="flex items-center gap-1.5 font-display text-lg leading-tight font-semibold text-content">
        {children}
        <ArrowRight
            size={16}
            aria-hidden
            className="shrink-0 text-brand transition-transform group-hover:translate-x-0.5"
        />
    </span>
);

/**
 * Someone's Gaming 25 as one small card above their About, the whole of it
 * the way into the grid. Their own, not yet begun, is an invitation; a
 * visitor sees nothing of one that hasn't been.
 */
const Gaming25Preview = ({
    username,
    canSee,
    isOwner,
}: Gaming25PreviewProps) => {
    const { data: grid, isLoading } = useGaming25(username, canSee);
    const path = gaming25Path(username);

    if (!canSee) return null;
    if (isLoading) return <Skeleton className="h-32 rounded-lg" />;
    const picks = grid?.picks ?? [];

    if (picks.length === 0) {
        if (!isOwner) return null;
        return (
            <Link to={path} className={CARD}>
                <Fan front={null} behind={[null, null]} />
                <span className="min-w-0 flex-1">
                    <Heading>Make your Gaming 25</Heading>
                    <span className="mt-0.5 block text-body-sm text-content-secondary">
                        25 categories, one game each.
                    </span>
                </span>
            </Link>
        );
    }

    const favourite = picks.find((p) => p.category === GAMING_25_CENTRE);
    const others = picks.filter((p) => p !== favourite);
    const front = favourite ?? others.shift() ?? null;

    return (
        <Link to={path} aria-label={`${username}’s Gaming 25`} className={CARD}>
            <Fan
                front={front}
                behind={[others[0] ?? null, others[1] ?? null]}
            />
            <span className="min-w-0 flex-1">
                <Heading>Gaming 25</Heading>
                {favourite && (
                    <>
                        <span className="mt-2 block text-label-sm font-semibold text-medal-gold">
                            Favourite game
                        </span>
                        <span className="block truncate text-body-sm text-content">
                            {favourite.game.title}
                        </span>
                    </>
                )}
                <span className="mt-1.5 flex items-center gap-2 font-mono text-label-sm whitespace-nowrap text-content-muted">
                    <span>
                        {picks.length} of {GAMING_25_SIZE} picked
                    </span>
                    <span aria-hidden>·</span>
                    <span className="inline-flex items-center gap-1">
                        <Heart
                            size={12}
                            aria-hidden
                            className="fill-love text-love"
                        />
                        {formatCount(grid?.loveCount ?? 0)}
                    </span>
                </span>
            </span>
        </Link>
    );
};

export default Gaming25Preview;
