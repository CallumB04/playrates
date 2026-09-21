import type { Game } from "@playrates/shared";
import type { GameLogSummary } from "@playrates/shared";
import GameCover from "../../../components/game/GameCover";
import StatusBadge from "../../../components/ui/StatusBadge";
import Button from "../../../components/ui/Button";
import LedgerRow, { LedgerList } from "../../../components/ui/LedgerRow";
import {
    STATUS_PRESENTATION,
    displayStatusFor,
} from "../../../constants/gameStatus";
import { releaseYear } from "../../../lib/format";
import type { Fact } from "../lib/gameFacts";
import { cn } from "../../../lib/cn";

interface GameCoverPlateProps {
    game: Game;
    log: GameLogSummary | undefined;
    isSignedIn: boolean;
    facts: Fact[];
    onPrimary: () => void;
    /** Only passed when the viewer has a log to look at. */
    onViewLog?: () => void;
    onQuickLog: (status: "backlog" | "wishlist") => void;
    isSaving: boolean;
}

// A tinted panel with a word in it reads as a notice, so these get a hover
// fill and a pointer to say they're buttons.
const QUICK = ["backlog", "wishlist"] as const;

const QUICK_TONE: Record<(typeof QUICK)[number], string> = {
    backlog:
        "border-status-backlog/50 text-status-backlog-content hover:bg-status-backlog hover:border-status-backlog hover:text-white",
    wishlist:
        "border-status-wishlist/50 text-status-wishlist-content hover:bg-status-wishlist hover:border-status-wishlist hover:text-white",
};

/** The cover, lifted. The largest art on any screen, so it gets the deepest
 *  shadow and nothing framing it. */
const GameCoverPlate = ({
    game,
    log,
    isSignedIn,
    facts,
    onPrimary,
    onViewLog,
    onQuickLog,
    isSaving,
}: GameCoverPlateProps) => {
    const status = log ? displayStatusFor(log.status, log.playedStatus) : null;

    return (
        <div className="flex flex-col gap-4">
            <div>
                {/* Edge-to-edge on a phone, a 3:4 cover eats the whole first
                    screen and pushes the title below the fold. It only spans
                    the column once the column is a column. */}
                <div className="relative mx-auto aspect-3/4 w-2/3 max-w-[240px] overflow-hidden rounded-lg bg-surface-media shadow-e3 sm:w-1/2 sm:max-w-[280px] lg:w-full lg:max-w-none">
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
                            className="absolute top-3 right-3"
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

            {log && onViewLog ? (
                // Viewing leads once a log exists; editing is one press in.
                <div className="flex flex-col gap-2">
                    <Button size="lg" onClick={onPrimary} disabled={isSaving}>
                        Edit your log
                    </Button>
                    <Button
                        variant="secondary"
                        size="lg"
                        onClick={onViewLog}
                        disabled={isSaving}
                    >
                        View your log
                    </Button>
                </div>
            ) : (
                <Button size="lg" onClick={onPrimary} disabled={isSaving}>
                    {!isSignedIn ? "Log in to add" : "Log this game"}
                </Button>
            )}

            {isSignedIn && !log && (
                <div className="flex gap-2">
                    {QUICK.map((status) => {
                        const { label, icon: Icon } =
                            STATUS_PRESENTATION[status];
                        return (
                            <button
                                key={status}
                                type="button"
                                onClick={() => onQuickLog(status)}
                                disabled={isSaving}
                                className={cn(
                                    "inline-flex min-h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-sm border bg-surface-raised text-body-sm font-medium lift",
                                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                                    "hover:-translate-y-px hover:shadow-plate",
                                    "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0",
                                    QUICK_TONE[status]
                                )}
                            >
                                <Icon size={15} aria-hidden />
                                {label}
                            </button>
                        );
                    })}
                </div>
            )}

            {facts.length > 0 && (
                <div className="border-t border-subtle pt-3.5">
                    <h2 className="mb-1.5 text-label text-content-muted">
                        Details
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
