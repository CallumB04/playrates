import type { Game } from "@playrates/shared";
import type { GameLogSummary } from "@playrates/shared";
import GameCover from "../../../components/game/GameCover";
import StatusBadge from "../../../components/ui/StatusBadge";
import Button from "../../../components/ui/Button";
import LedgerRow, { LedgerList } from "../../../components/ui/LedgerRow";
import { displayStatusFor } from "../../../constants/gameStatus";
import { releaseYear } from "../../../lib/format";
import type { Fact } from "../lib/gameFacts";
import { cn } from "../../../lib/cn";

interface GameCoverPlateProps {
    game: Game;
    log: GameLogSummary | undefined;
    isSignedIn: boolean;
    facts: Fact[];
    onPrimary: () => void;
    onQuickLog: (status: "backlog" | "wishlist") => void;
    isSaving: boolean;
}

const QUICK = [
    {
        status: "backlog" as const,
        label: "Backlog",
        className:
            "border-status-backlog bg-status-backlog-quiet text-status-backlog-content",
    },
    {
        status: "wishlist" as const,
        label: "Wishlist",
        className:
            "border-status-wishlist bg-status-wishlist-quiet text-status-wishlist-content",
    },
];

/**
 * The cover, pressed into the paper. This is the clearest statement of the
 * device on any screen: the thing you own sits in a well, and the actions the
 * system offers sit raised beneath it.
 */
const GameCoverPlate = ({
    game,
    log,
    isSignedIn,
    facts,
    onPrimary,
    onQuickLog,
    isSaving,
}: GameCoverPlateProps) => {
    const status = log ? displayStatusFor(log.status, log.playedStatus) : null;

    return (
        <div className="flex flex-col gap-4">
            <div className="border border-strong bg-surface-sunken p-3.5 inset-shadow-deep shadow-lip">
                <div className="relative aspect-3/4 overflow-hidden bg-surface-media shadow-cover">
                    <GameCover
                        coverUrl={game.coverUrl}
                        title={game.title}
                        className="size-full"
                    />
                    {status && (
                        <StatusBadge
                            status={status}
                            size="stamp"
                            onMedia
                            animateOnChange
                            className="absolute right-3 top-3"
                        />
                    )}
                    <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-overlay-tile to-transparent p-4 pt-12 font-display text-2xl leading-tight text-content-on-media">
                        {game.title}
                    </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-label-sm text-content-muted">
                    <span>{game.slug.slice(0, 22)}</span>
                    <span>{releaseYear(game.releaseDate)}</span>
                </div>
            </div>

            <Button size="lg" onClick={onPrimary} disabled={isSaving}>
                {!isSignedIn
                    ? "Log in to add"
                    : log
                      ? "Edit your log"
                      : "Log this game"}
            </Button>

            {isSignedIn && !log && (
                <div className="flex gap-2">
                    {QUICK.map((quick) => (
                        <button
                            key={quick.status}
                            type="button"
                            onClick={() => onQuickLog(quick.status)}
                            disabled={isSaving}
                            className={cn(
                                "plate-press min-h-10 flex-1 border text-body-sm font-medium",
                                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                                "active:inset-shadow-press disabled:opacity-60",
                                quick.className
                            )}
                        >
                            {quick.label}
                        </button>
                    ))}
                </div>
            )}

            {facts.length > 0 && (
                <div className="border-t border-strong pt-3.5">
                    <h2 className="mb-1.5 text-label text-content-muted">
                        Ledger
                    </h2>
                    <LedgerList>
                        {facts.map((fact, i) => (
                            <LedgerRow
                                key={fact.label}
                                label={fact.label}
                                value={fact.value}
                                rule={i < facts.length - 1}
                            />
                        ))}
                    </LedgerList>
                </div>
            )}
        </div>
    );
};

export default GameCoverPlate;
