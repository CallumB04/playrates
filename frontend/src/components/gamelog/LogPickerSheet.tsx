import { Plus } from "lucide-react";
import Modal from "../ui/Modal";
import { useGame, usePlatformSystems } from "../../hooks/queries/useGames";
import { useMyLogBundle } from "../../hooks/queries/useGameLogs";
import { remainingSystems, systemsForGame } from "../../lib/gameSystems";
import { TextSkeleton } from "../ui/Skeleton";
import { useLogFlow } from "./useLogFlow";
import type { PickIntent } from "./logTarget";
import LogRow from "./LogRow";

interface LogPickerSheetProps {
    gameId: number;
    intent: PickIntent;
    onClose: () => void;
}

/** Which of a game's logs a press meant, asked only once there are two. */
const LogPickerSheet = ({ gameId, intent, onClose }: LogPickerSheetProps) => {
    const flow = useLogFlow();
    const { data: game } = useGame(gameId);
    const { data: systems } = usePlatformSystems();
    const { data: bundle } = useMyLogBundle(gameId);

    const logs = bundle?.logs ?? [];
    const free = remainingSystems(
        systemsForGame(systems ?? [], game?.systems ?? []),
        logs.map((l) => l.system)
    );

    return (
        <Modal
            onClose={onClose}
            labelledBy="log-picker-title"
            className="w-full max-w-md"
        >
            <h2
                id="log-picker-title"
                className="border-b border-subtle pr-10 pb-3 font-display text-section text-content"
            >
                {intent === "review" ? "Review which platform?" : "Your logs"}
                {game && (
                    <span className="mt-1 block truncate font-sans text-body-sm text-content-muted">
                        {game.title}
                    </span>
                )}
            </h2>

            {!bundle ? (
                <div className="mt-4">
                    <TextSkeleton lines={3} />
                </div>
            ) : (
                <div className="-mx-3 mt-3 flex flex-col">
                    {logs.map((log) => (
                        <LogRow
                            key={log.id}
                            log={log}
                            onSelect={() =>
                                flow.edit(gameId, log.id, intent === "review")
                            }
                            aside={
                                intent === "review" ? (
                                    <span className="text-label-sm text-content-muted">
                                        {log.review
                                            ? "Edit review"
                                            : "Write one"}
                                    </span>
                                ) : undefined
                            }
                        />
                    ))}
                    {free.length > 0 && (
                        <button
                            type="button"
                            onClick={() => flow.add(gameId)}
                            className="mx-3 mt-2 flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-sm border border-dashed border-strong text-label text-content-secondary lift hover:border-brand hover:text-content"
                        >
                            <Plus size={15} aria-hidden />
                            Add a platform
                        </button>
                    )}
                </div>
            )}
        </Modal>
    );
};

export default LogPickerSheet;
