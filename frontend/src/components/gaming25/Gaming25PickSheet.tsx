import { useId, useState } from "react";
import { Trash2 } from "lucide-react";
import {
    GAMING_25_SIZE,
    gaming25Label,
    type Gaming25,
    type Gaming25Category,
} from "@playrates/shared";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import StatusBadge from "../ui/StatusBadge";
import GameCover from "../game/GameCover";
import GamePicker, { type PickedGame } from "../community/GamePicker";
import { ApiError } from "../../api";
import { useNotify } from "../../contexts/NotificationContext";
import { useMyGameLogIds } from "../../hooks/queries/useGameLogs";
import { useSetGaming25Pick } from "../../hooks/queries/useGaming25";
import { displayStatusFor } from "../../constants/gameStatus";
import { nextEmpty } from "../../lib/gaming25";

interface Gaming25PickSheetProps {
    grid: Gaming25;
    /** The cell pressed. */
    start: Gaming25Category;
    onClose: () => void;
    /** The last empty cell has just been filled. */
    onComplete: () => void;
}

/**
 * One cell's game. A pick saves at once and moves on to the next empty
 * cell, so filling the grid from nothing is one run through the sheet
 * rather than 25 trips back to it.
 */
const Gaming25PickSheet = ({
    grid,
    start,
    onClose,
    onComplete,
}: Gaming25PickSheetProps) => {
    const titleId = useId();
    const fieldId = useId();
    const notify = useNotify();
    const save = useSetGaming25Pick(grid.owner.username);
    const [current, setCurrent] = useState(start);
    const { data: myLogs } = useMyGameLogIds();

    const filled = new Set(grid.picks.map((p) => p.category));
    const picked = grid.picks.find((p) => p.category === current)?.game;

    const failed = (error: unknown) =>
        notify(
            error instanceof ApiError && error.status === 422
                ? error.message
                : "Couldn't save that pick",
            "error"
        );

    const choose = (game: PickedGame | null) => {
        if (!game) return;
        save.mutate({ category: current, game }, { onError: failed });
        const wasFull = filled.size === GAMING_25_SIZE;
        const next = nextEmpty([...filled, current], current);
        if (next) setCurrent(next);
        else if (!wasFull) onComplete();
        else onClose();
    };

    const remove = () =>
        save.mutate({ category: current, game: null }, { onError: failed });

    const skip = nextEmpty(filled, current);

    return (
        <Modal
            onClose={onClose}
            labelledBy={titleId}
            className="w-full max-w-md"
        >
            <p className="pr-10 font-mono text-label-sm text-content-muted">
                {filled.size} of {GAMING_25_SIZE} picked
            </p>
            <h2
                id={titleId}
                className="mt-0.5 pr-10 font-display text-section text-content"
            >
                {gaming25Label(current)}
            </h2>

            <div className="mt-4 flex flex-col gap-3">
                {picked && (
                    <div className="flex items-center gap-3 rounded-sm bg-surface-sunken p-2">
                        <GameCover
                            coverUrl={picked.coverUrl}
                            title=""
                            className="aspect-3/4 w-10 shrink-0 overflow-hidden rounded-xs"
                        />
                        <span className="min-w-0 flex-1 truncate text-body-sm font-medium text-content">
                            {picked.title}
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={remove}
                            className="min-h-11 sm:min-h-9"
                        >
                            <Trash2 size={14} aria-hidden />
                            Remove
                        </Button>
                    </div>
                )}
                <label htmlFor={fieldId} className="sr-only">
                    {picked ? "Pick a different game" : "Pick a game"}
                </label>
                <GamePicker
                    /* A fresh field for each cell, its last search gone, and
                       focused, so a run of picks never leaves the keyboard. */
                    key={current}
                    id={fieldId}
                    autoFocus
                    inlineResults
                    value={null}
                    placeholder={
                        picked
                            ? "Search for a different game"
                            : "Search for a game"
                    }
                    markFor={(id) => {
                        const log = myLogs?.find((l) => l.gameId === id);
                        return log ? (
                            <StatusBadge
                                status={displayStatusFor(
                                    log.status,
                                    log.playedStatus
                                )}
                                size="stamp"
                                className="shrink-0"
                            />
                        ) : null;
                    }}
                    onChange={choose}
                />
            </div>

            <div className="mt-4 flex flex-col-reverse gap-2 border-t border-subtle pt-4 sm:flex-row sm:justify-end">
                {skip && skip !== current && (
                    <Button
                        variant="secondary"
                        onClick={() => setCurrent(skip)}
                        className="w-full sm:w-auto"
                    >
                        Skip to {gaming25Label(skip)}
                    </Button>
                )}
                <Button onClick={onClose} className="w-full sm:w-auto">
                    Done
                </Button>
            </div>
        </Modal>
    );
};

export default Gaming25PickSheet;
