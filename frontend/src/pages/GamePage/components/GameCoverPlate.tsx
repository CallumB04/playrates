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
 * The cover, lifted. It is the largest piece of art on any screen, so it gets
 * the deepest shadow in the system and nothing framing it — the old version
 * sat it in a bordered well, which put a picture frame around box art.
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
            <div>
                <div className="relative aspect-3/4 overflow-hidden rounded-lg bg-surface-media shadow-e3">
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

                </div>
                <div className="mt-3 flex items-center justify-between text-label-sm text-content-muted">
                    <span className="truncate">{game.title}</span>
                    <span className="shrink-0 font-mono">
                        {releaseYear(game.releaseDate)}
                    </span>
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
                                "lift min-h-10 flex-1 rounded-sm border text-body-sm font-medium",
                                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                                "hover:-translate-y-px disabled:opacity-60",
                                quick.className
                            )}
                        >
                            {quick.label}
                        </button>
                    ))}
                </div>
            )}

            {facts.length > 0 && (
                <div className="border-t border-subtle pt-3.5">
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
