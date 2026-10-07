import type { RefObject } from "react";
import { Plus } from "lucide-react";
import type { Game, GameLogSummary, LogBundle } from "@playrates/shared";
import MyLogsPlate from "../../../components/gamelog/MyLogsPlate";
import CoverCarousel from "./CoverCarousel";
import StatusBadge from "../../../components/ui/StatusBadge";
import Button from "../../../components/ui/Button";
import {
    STATUS_PRESENTATION,
    displayStatusFor,
} from "../../../constants/gameStatus";
import { releaseYear } from "../../../lib/format";
import type { GameFacts } from "../lib/gameFacts";
import GameDetails from "./GameDetails";
import { cn } from "../../../lib/cn";

interface GameCoverPlateProps {
    game: Game;
    log: GameLogSummary | undefined;
    isSignedIn: boolean;
    facts: GameFacts | null;
    onPrimary: () => void;
    onViewLog: () => void;
    /** Your logs in full, once there are two to add up. */
    bundle?: LogBundle;
    /** Whether a console is left to log it on. */
    canAdd: boolean;
    onAddPlatform: () => void;
    onEditLog: (logId: number) => void;
    onQuickLog: (status: "backlog" | "wishlist") => void;
    isSaving: boolean;
    /** Marks where the log buttons end, for the phone's sticky bar. */
    actionsEndRef?: RefObject<HTMLSpanElement>;
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
    bundle,
    canAdd,
    onAddPlatform,
    onEditLog,
    onQuickLog,
    isSaving,
    actionsEndRef,
}: GameCoverPlateProps) => {
    const status = log ? displayStatusFor(log.status, log.playedStatus) : null;

    return (
        <div className="flex flex-col gap-4">
            <div>
                {/* Edge-to-edge on a phone, a 3:4 cover eats the whole first
                    screen and pushes the title below the fold. It only spans
                    the column once the column is a column. */}
                <CoverCarousel
                    covers={[
                        { url: game.coverUrl, label: null },
                        ...game.altCovers,
                    ]}
                    title={game.title}
                    className="mx-auto w-2/3 max-w-[240px] sm:w-1/2 sm:max-w-[280px] lg:w-full lg:max-w-none"
                    overlay={
                        status && (
                            <StatusBadge
                                status={status}
                                size="stamp"
                                onMedia
                                animateOnChange
                                className="absolute top-3 right-3"
                            />
                        )
                    }
                />
                <div className="mt-3 flex items-center justify-between text-label-sm text-content-muted">
                    <span className="truncate">{game.title}</span>
                    <span className="shrink-0 font-mono">
                        {releaseYear(game.releaseDate)}
                    </span>
                </div>
            </div>

            {log && log.logs.length > 1 && bundle?.rollup ? (
                <MyLogsPlate
                    logs={bundle.logs}
                    rollup={bundle.rollup}
                    canAdd={canAdd}
                    onEdit={onEditLog}
                    onAdd={onAddPlatform}
                    onView={onViewLog}
                />
            ) : log ? (
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
                    {/* Quiet: most games are played on one console. Here for
                        the ones that weren't, rather than a menu to find. */}
                    {canAdd && (
                        <button
                            type="button"
                            onClick={onAddPlatform}
                            className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 text-label-sm text-content-secondary lift hover:text-content hover:underline"
                        >
                            <Plus size={14} aria-hidden />
                            Played it on another platform?
                        </button>
                    )}
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
                                    "inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-sm border bg-surface-raised text-body-sm font-medium lift sm:min-h-10",
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

            <span ref={actionsEndRef} aria-hidden />

            {facts && <GameDetails facts={facts} />}
        </div>
    );
};

export default GameCoverPlate;
