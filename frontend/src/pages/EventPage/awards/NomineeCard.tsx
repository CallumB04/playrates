import { Check, Trophy } from "lucide-react";
import type { AwardNominee, Platform } from "@playrates/shared";
import GameTile, { type TileAction } from "../../../components/game/GameTile";
import type { DisplayStatus } from "../../../constants/gameStatus";
import ShareBar from "../../../components/events/ShareBar";
import { buttonClass } from "../../../components/ui/buttonClass";
import { cn } from "../../../lib/cn";

interface NomineeCardProps {
    nominee: AwardNominee;
    platforms: Platform[];
    picked: boolean;
    /** Null hides the crowd's share: you haven't picked here yet. */
    share: number | null;
    /** Whether a pick can be made or changed now. */
    canPick: boolean;
    /** Whether any nominee in its category names a person, so every card
     *  in the row keeps room for the name and stays level. */
    named: boolean;
    onPick: () => void;
    actions: TileAction[];
    status: DisplayStatus | null;
}

/** A named nominee with no game has no cover; its initials stand in. */
const NamePlate = ({
    label,
    detail,
}: {
    label: string;
    detail: string | null;
}) => (
    <div className="flex aspect-3/4 flex-col items-center justify-center gap-2 rounded-md border border-subtle bg-surface-sunken px-3 text-center">
        <span className="font-display text-title text-content-secondary">
            {label
                .split(/\s+/)
                .slice(0, 2)
                .map((word) => word[0])
                .join("")}
        </span>
        {detail && (
            <span className="text-label-sm text-content-muted">{detail}</span>
        )}
    </div>
);

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
    onPick,
    actions,
    status,
}: NomineeCardProps) => {
    const name = nominee.label ?? nominee.game?.title ?? "";
    return (
        <li className="flex min-w-0 flex-col gap-2.5">
            <div
                className={cn(
                    "relative rounded-lg",
                    nominee.won
                        ? "ring-2 ring-brand ring-offset-2 ring-offset-surface"
                        : picked &&
                              "ring-2 ring-brand/50 ring-offset-2 ring-offset-surface"
                )}
            >
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
                    />
                ) : (
                    <NamePlate label={name} detail={nominee.detail} />
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
                    {nominee.label && !nominee.game && (
                        <p className="line-clamp-2 text-body-sm font-medium text-content">
                            {nominee.label}
                        </p>
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
