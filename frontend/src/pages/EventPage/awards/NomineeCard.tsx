import { Check, Trophy } from "lucide-react";
import {
    igdbSized,
    isIgdbImage,
    type AwardNominee,
    type Platform,
} from "@playrates/shared";
import GameTile, { type TileAction } from "../../../components/game/GameTile";
import type { DisplayStatus } from "../../../constants/gameStatus";
import ShareBar from "../../../components/events/ShareBar";
import { buttonClass } from "../../../components/ui/buttonClass";
import { cn } from "../../../lib/cn";
import { markFor } from "./nomineeMarks";
import { TILE_RING, type TileRing } from "../../../components/game/tileRing";

interface NomineeCardProps {
    nominee: AwardNominee;
    platforms: Platform[];
    picked: boolean;
    /** Null hides the crowd's share: you haven't picked here yet. */
    share: number | null;
    /** Whether a pick can be made or changed now. */
    canPick: boolean;
    /** Whether any nominee in its category names a person beside a game,
     *  so every card in the row keeps room for the name and stays level. */
    named: boolean;
    /** Its category's address, for the mark of a nominee that isn't a game. */
    categorySlug: string;
    onPick: () => void;
    actions: TileAction[];
    status: DisplayStatus | null;
}

/**
 * A nominee that isn't a game: a person, a team, a show, a mod. The shape of
 * a cover, so a row of them sits level with games: its category's mark, on
 * its picture where it has one, and its name and what it's there for across
 * the foot, where a game tile has its title.
 */
const NamePlate = ({
    label,
    detail,
    imageUrl,
    categorySlug,
    ring,
}: {
    label: string;
    detail: string | null;
    imageUrl: string | null;
    categorySlug: string;
    ring?: TileRing;
}) => {
    const Mark = markFor(categorySlug);
    return (
        <div
            className={cn(
                "relative isolate flex aspect-3/4 flex-col justify-end overflow-hidden rounded-md border border-subtle bg-surface-sunken p-2.5 sm:p-3",
                ring && TILE_RING[ring]
            )}
        >
            {imageUrl && (
                <>
                    <img
                        src={
                            isIgdbImage(imageUrl)
                                ? igdbSized(imageUrl, "cover_big")
                                : imageUrl
                        }
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 -z-10 size-full object-cover"
                    />
                    <span
                        aria-hidden
                        className="absolute inset-x-0 bottom-0 -z-10 h-2/3 bg-linear-to-t from-media-scrim-strong to-transparent"
                    />
                </>
            )}
            {/* On a picture too: a mod's card shows its host game's cover,
                and the mark says it's the mod in the running, not the game. */}
            <span
                aria-hidden
                className="grid min-h-0 flex-1 place-items-center"
            >
                <span className="grid size-10 place-items-center rounded-full bg-surface text-content-muted shadow-plate ring-1 ring-subtle sm:size-14">
                    <Mark className="size-4.5 sm:size-6" strokeWidth={1.75} />
                </span>
            </span>
            <p
                className={cn(
                    "line-clamp-2 text-body-sm leading-snug font-semibold",
                    imageUrl ? "text-content-on-media" : "text-content"
                )}
            >
                {label}
            </p>
            {detail && (
                <p
                    className={cn(
                        "truncate text-label-sm",
                        imageUrl
                            ? "text-content-on-media/80"
                            : "text-content-muted"
                    )}
                >
                    {detail}
                </p>
            )}
        </div>
    );
};

/**
 * One nominee: its game, which can be logged from here like any cover, and
 * under it the same rows on every card, so a row of them stays level
 * whatever each one says: the crowd's share, then your pick.
 */
const NomineeCard = ({
    nominee,
    platforms,
    picked,
    share,
    canPick,
    named,
    categorySlug,
    onPick,
    actions,
    status,
}: NomineeCardProps) => {
    const name = nominee.label ?? nominee.game?.title ?? "";
    const ring = nominee.won ? "strong" : picked ? "soft" : undefined;
    return (
        <li className="flex min-w-0 flex-col gap-2.5">
            <div className="relative">
                {/* The winner's medal sits on the cover's top edge, clear of
                    the tile's own corners, as Gaming 25 crowns its
                    favourite. */}
                {nominee.won && (
                    <span className="absolute -top-3.5 left-1/2 z-10 grid size-7 -translate-x-1/2 place-items-center rounded-full bg-brand text-content-on-solid shadow-solid">
                        <Trophy size={14} strokeWidth={2.5} aria-hidden />
                        <span className="sr-only">Winner</span>
                    </span>
                )}
                {nominee.game ? (
                    <GameTile
                        gameId={nominee.game.id}
                        title={nominee.game.title}
                        coverUrl={nominee.game.coverUrl}
                        platformSlugs={nominee.game.platforms}
                        platforms={platforms}
                        status={status}
                        actions={actions}
                        narrowFoot
                        shortTitle
                        ring={ring}
                    />
                ) : (
                    <NamePlate
                        label={name}
                        detail={nominee.detail}
                        imageUrl={nominee.imageUrl}
                        categorySlug={categorySlug}
                        ring={ring}
                    />
                )}
            </div>
            {named && (
                <div className="min-h-10 min-w-0">
                    {nominee.label && nominee.game && (
                        <>
                            <p className="truncate text-body-sm font-medium text-content">
                                {nominee.label}
                            </p>
                            {nominee.detail && (
                                <p className="truncate text-label-sm text-content-muted">
                                    {nominee.detail}
                                </p>
                            )}
                        </>
                    )}
                </div>
            )}
            {share !== null && (
                <div className="flex items-center gap-2">
                    <ShareBar
                        value={share / 100}
                        label={`${share}% of picks`}
                        className="flex-1"
                    />
                    <span className="w-9 text-right text-label-sm text-content-muted tabular-nums">
                        {share}%
                    </span>
                </div>
            )}
            {canPick ? (
                <button
                    type="button"
                    aria-pressed={picked}
                    aria-label={picked ? `${name}, your pick` : `Pick ${name}`}
                    onClick={onPick}
                    className={buttonClass(
                        picked ? "primary" : "secondary",
                        "w-full",
                        "md"
                    )}
                >
                    {/* Three to a row on a phone leave room for the words
                        alone; the filled button says it's picked. */}
                    {picked && (
                        <Check
                            size={16}
                            aria-hidden
                            className="shrink-0 max-sm:hidden"
                        />
                    )}
                    <span className="whitespace-nowrap">
                        {picked ? "Your pick" : "Pick"}
                    </span>
                </button>
            ) : (
                // The same height on every card, said or not, so nothing
                // under it moves.
                <p
                    className={cn(
                        "flex min-h-6 items-center gap-1.5 text-body-sm",
                        nominee.won
                            ? "font-bold text-brand-text"
                            : "font-medium text-content-secondary"
                    )}
                >
                    {picked && <Check size={16} aria-hidden />}
                    {picked
                        ? nominee.won
                            ? "You called it"
                            : "Your pick"
                        : nominee.won
                          ? "Winner"
                          : null}
                </p>
            )}
        </li>
    );
};

export default NomineeCard;
